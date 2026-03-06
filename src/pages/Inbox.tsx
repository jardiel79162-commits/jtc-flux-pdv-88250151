import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ImagePlus, Shield, Loader2, X, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_type: string;
  content: string | null;
  image_url: string | null;
  is_system: boolean;
  is_read: boolean;
  created_at: string;
}

export default function Inbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  useEffect(() => {
    let userId: string | null = null;
    let pollTimer: ReturnType<typeof setInterval>;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      userId = session.user.id;

      await loadMessages();
      markAsRead();

      const channel = supabase
        .channel(`inbox-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "admin_messages",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const msg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            scrollToBottom();
            if (msg.sender_type === "admin") {
              supabase.from("admin_messages").update({ is_read: true }).eq("id", msg.id).then(() => {});
            }
          }
        )
        .subscribe();

      pollTimer = setInterval(() => {
        loadMessages();
      }, 3000);

      return channel;
    };

    let channel: any;
    init().then((ch) => { channel = ch; });

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const loadMessages = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("admin_messages")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });

    setMessages((data as any) || []);
    setLoading(false);
    scrollToBottom();
  };

  const markAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("admin_messages")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("sender_type", "admin")
      .eq("is_read", false);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("admin_messages").insert({
      user_id: session.user.id,
      sender_type: "user",
      content: trimmed,
    } as any);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao enviar mensagem" });
    } else {
      setText("");
    }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Apenas imagens são permitidas" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Imagem muito grande (máx. 5MB)" });
      return;
    }

    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const ext = file.name.split(".").pop();
    const path = `${session.user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(path, file);

    if (uploadError) {
      toast({ variant: "destructive", title: "Erro ao enviar imagem" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(path);

    await supabase.from("admin_messages").insert({
      user_id: session.user.id,
      sender_type: "user",
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

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-2xl mx-auto bg-background overflow-hidden">
      {/* Header - fixo no topo */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm text-foreground">Suporte JTC FluxPDV</p>
          <p className="text-xs text-muted-foreground">Administrador • Online</p>
        </div>
      </div>

      {/* Messages - apenas esta área tem scroll */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm font-medium">Nenhuma mensagem ainda</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Envie uma mensagem para o suporte</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  msg.is_system
                    ? "bg-accent/20 border border-accent/30 text-foreground text-center w-full max-w-full rounded-lg"
                    : msg.sender_type === "user"
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
                    alt="Imagem"
                    className="max-w-full rounded-lg mt-1 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPreviewImage(msg.image_url)}
                  />
                )}
                <p
                  className={`text-[10px] mt-1 ${
                    msg.sender_type === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img src={previewImage} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

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
  );
}
