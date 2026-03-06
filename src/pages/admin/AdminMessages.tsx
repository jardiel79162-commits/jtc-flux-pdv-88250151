import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send, ImagePlus, Loader2, Search, ChevronLeft, X, Store, Gift, MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  user_id: string;
  full_name: string | null;
  email: string | null;
  store_name: string | null;
  store_logo: string | null;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
}

interface Message {
  id: string;
  user_id: string;
  sender_type: string;
  content: string | null;
  image_url: string | null;
  is_system: boolean;
  is_read: boolean;
  created_at: string;
}

export default function AdminMessages() {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [systemMsg, setSystemMsg] = useState("");
  const [showSystemInput, setShowSystemInput] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedUserIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Keep ref in sync
  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  // Auto-open user from query param
  useEffect(() => {
    const userId = searchParams.get("user");
    if (userId) {
      openChat(userId);
    }
  }, [searchParams]);

  const loadConversations = useCallback(async () => {
    try {
      const { data: msgData } = await supabase
        .from("admin_messages")
        .select("user_id, content, created_at, sender_type, is_read, image_url")
        .order("created_at", { ascending: false });

      if (!msgData || msgData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const userMap = new Map<string, { unread: number; lastMsg: string | null; lastAt: string | null }>();
      for (const m of msgData) {
        if (!userMap.has(m.user_id)) {
          userMap.set(m.user_id, {
            unread: 0,
            lastMsg: m.content || (m.image_url ? "📷 Imagem" : null),
            lastAt: m.created_at,
          });
        }
        if (m.sender_type === "user" && !m.is_read) {
          userMap.get(m.user_id)!.unread++;
        }
      }

      const userIds = Array.from(userMap.keys());
      const [{ data: profiles }, { data: stores }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds),
        supabase.from("store_settings").select("user_id, store_name, logo_url").in("user_id", userIds),
      ]);

      const convs: Conversation[] = userIds.map((uid) => {
        const entry = userMap.get(uid)!;
        const profile = profiles?.find((p) => p.user_id === uid);
        const store = stores?.find((s) => s.user_id === uid);
        return {
          user_id: uid,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          store_name: store?.store_name || null,
          store_logo: store?.logo_url || null,
          unread_count: entry.unread,
          last_message: entry.lastMsg,
          last_message_at: entry.lastAt,
        };
      });

      convs.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (b.unread_count > 0 && a.unread_count === 0) return 1;
        return new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime();
      });

      setConversations(convs);

      // Update selectedUserInfo if chat is open
      const currentId = selectedUserIdRef.current;
      if (currentId) {
        const updated = convs.find((c) => c.user_id === currentId);
        if (updated) setSelectedUserInfo(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load conversations + realtime + polling
  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel("admin-inbox-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_messages" },
        (payload) => {
          const msg = payload.new as Message;
          loadConversations();
          const currentId = selectedUserIdRef.current;
          if (msg.user_id === currentId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            scrollToBottom();
            if (msg.sender_type === "user") {
              supabase.from("admin_messages").update({ is_read: true }).eq("id", msg.id).then(() => {});
            }
          }
        }
      )
      .subscribe();

    const pollTimer = setInterval(() => {
      loadConversations();
      const currentId = selectedUserIdRef.current;
      if (currentId) {
        supabase
          .from("admin_messages")
          .select("*")
          .eq("user_id", currentId)
          .order("created_at", { ascending: true })
          .then(({ data }) => {
            if (data) {
              setMessages((prev) => {
                const ids = new Set(prev.map((m) => m.id));
                const newMsgs = (data as Message[]).filter((m) => !ids.has(m.id));
                if (newMsgs.length > 0) {
                  scrollToBottom();
                  return [...prev, ...newMsgs];
                }
                return prev;
              });
            }
          });
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollTimer);
    };
  }, [loadConversations]);

  const openChat = async (userId: string) => {
    setSelectedUserId(userId);
    setMsgLoading(true);

    let convInfo = conversations.find((c) => c.user_id === userId) || null;

    if (!convInfo || (!convInfo.full_name && !convInfo.store_name)) {
      const [{ data: profile }, { data: store }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").eq("user_id", userId).maybeSingle(),
        supabase.from("store_settings").select("user_id, store_name, logo_url").eq("user_id", userId).maybeSingle(),
      ]);
      convInfo = {
        user_id: userId,
        full_name: profile?.full_name || null,
        email: profile?.email || null,
        store_name: store?.store_name || null,
        store_logo: store?.logo_url || null,
        unread_count: 0,
        last_message: null,
        last_message_at: null,
      };
    }
    setSelectedUserInfo(convInfo);

    const { data } = await supabase
      .from("admin_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    setMessages((data as any) || []);
    setMsgLoading(false);
    scrollToBottom();

    await supabase
      .from("admin_messages")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("sender_type", "user")
      .eq("is_read", false);

    loadConversations();
  };

  const sendMessage = async () => {
    if (!text.trim() || !selectedUserId) return;
    setSending(true);

    const { error } = await supabase.from("admin_messages").insert({
      user_id: selectedUserId,
      sender_type: "admin",
      content: text.trim(),
    } as any);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao enviar" });
    } else {
      setText("");
    }
    setSending(false);
  };

  const sendSystemMessage = async () => {
    if (!systemMsg.trim() || !selectedUserId) return;
    setSending(true);

    const { error } = await supabase.from("admin_messages").insert({
      user_id: selectedUserId,
      sender_type: "admin",
      content: systemMsg.trim(),
      is_system: true,
    } as any);

    if (error) {
      toast({ variant: "destructive", title: "Erro" });
    } else {
      setSystemMsg("");
      setShowSystemInput(false);
      toast({ title: "Notificação enviada!" });
    }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Apenas imagens" });
      return;
    }
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `admin/${selectedUserId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("message-images").upload(path, file);
    if (upErr) {
      toast({ variant: "destructive", title: "Erro ao enviar imagem" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("message-images").getPublicUrl(path);

    await supabase.from("admin_messages").insert({
      user_id: selectedUserId,
      sender_type: "admin",
      image_url: urlData.publicUrl,
    } as any);

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;
    return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${time}`;
  };

  const getDisplayName = (conv: Conversation | null) => {
    if (!conv) return "Sem nome";
    return conv.full_name || conv.store_name || conv.email || "Sem nome";
  };

  const getSubtitle = (conv: Conversation | null) => {
    if (!conv) return "";
    const parts: string[] = [];
    if (conv.store_name && conv.full_name) parts.push(conv.store_name);
    if (conv.email) parts.push(conv.email);
    return parts.join(" • ");
  };

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.store_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-[calc(100vh-80px)] bg-background rounded-xl overflow-hidden border border-border shadow-sm">
      {/* Conversations list */}
      <div className={`${selectedUserId ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[340px] shrink-0 border-r border-border`}>
        {/* Search header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Mensagens
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, loja ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <div
                key={conv.user_id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 border-b border-border/50 ${
                  selectedUserId === conv.user_id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
                onClick={() => openChat(conv.user_id)}
              >
                {conv.store_logo ? (
                  <img src={conv.store_logo} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-border" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate text-foreground">
                      {getDisplayName(conv)}
                    </p>
                    {conv.last_message_at && (
                      <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                        {formatTime(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message || "..."}
                    </p>
                    {conv.unread_count > 0 && (
                      <Badge className="text-[10px] px-1.5 h-5 shrink-0 bg-primary text-primary-foreground">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {selectedUserId ? (
        <div className="flex-1 flex flex-col bg-card">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0 h-8 w-8"
              onClick={() => setSelectedUserId(null)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            {selectedUserInfo?.store_logo ? (
              <img src={selectedUserInfo.store_logo} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate text-foreground">
                {getDisplayName(selectedUserInfo)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {getSubtitle(selectedUserInfo)}
              </p>
            </div>
            <Button
              variant={showSystemInput ? "default" : "outline"}
              size="sm"
              className="shrink-0 h-8 text-xs gap-1"
              onClick={() => setShowSystemInput(!showSystemInput)}
            >
              <Gift className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Notificação</span>
            </Button>
          </div>

          {/* System message sender (toggle) */}
          {showSystemInput && (
            <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border-b border-border animate-in slide-in-from-top-2">
              <Gift className="w-4 h-4 text-accent shrink-0" />
              <Input
                placeholder="Enviar notificação do sistema..."
                value={systemMsg}
                onChange={(e) => setSystemMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendSystemMessage()}
                className="h-8 text-xs flex-1"
                autoFocus
              />
              <Button size="sm" onClick={sendSystemMessage} disabled={!systemMsg.trim() || sending} className="h-8 text-xs">
                Enviar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSystemInput(false)} className="h-8 w-8 p-0">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
            {msgLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Envie a primeira mensagem</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      msg.is_system
                        ? "bg-accent/20 border border-accent/30 text-foreground text-center w-full max-w-full rounded-lg"
                        : msg.sender_type === "admin"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.is_system && (
                      <p className="text-[10px] font-semibold text-accent mb-1">🎁 Sistema</p>
                    )}
                    {msg.content && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                    {msg.image_url && (
                      <img
                        src={msg.image_url}
                        alt=""
                        className="max-w-full rounded-lg mt-1 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setPreviewImage(msg.image_url)}
                      />
                    )}
                    <p className={`text-[10px] mt-1 ${msg.sender_type === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
              </Button>
              <Input
                placeholder="Digite sua mensagem..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="flex-1 h-10"
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!text.trim() || sending}
                className="shrink-0 h-10 w-10"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/20">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-muted-foreground font-medium">Selecione uma conversa</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Escolha uma conversa ao lado para começar</p>
          </div>
        </div>
      )}

      {/* Image preview */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white" onClick={() => setPreviewImage(null)}>
            <X className="w-6 h-6" />
          </Button>
          <img src={previewImage} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
