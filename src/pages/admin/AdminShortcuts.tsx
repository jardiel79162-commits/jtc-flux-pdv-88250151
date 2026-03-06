import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Loader2, GripVertical, ExternalLink, Image, Ticket, Search } from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Shortcut {
  id: string;
  label: string;
  url: string;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface UserResult {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export default function AdminShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Shortcut form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", url: "", sort_order: "0" });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Spin grant
  const [showSpinDialog, setShowSpinDialog] = useState(false);
  const [spinSearch, setSpinSearch] = useState("");
  const [spinResults, setSpinResults] = useState<UserResult[]>([]);
  const [spinSearching, setSpinSearching] = useState(false);
  const [spinUser, setSpinUser] = useState<UserResult | null>(null);
  const [spinQty, setSpinQty] = useState("1");
  const [spinGranting, setSpinGranting] = useState(false);

  useEffect(() => { loadShortcuts(); }, []);

  const loadShortcuts = async () => {
    setLoading(true);
    try {
      const data = await adminApi("list_shortcuts");
      setShortcuts(data.shortcuts || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const uploadIcon = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "png";
    const filename = `shortcut-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("store-logos").upload(filename, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("store-logos").getPublicUrl(filename);
    return urlData.publicUrl;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ label: "", url: "", sort_order: String(shortcuts.length) });
    setIconFile(null);
    setIconPreview(null);
    setShowForm(true);
  };

  const openEdit = (s: Shortcut) => {
    setEditingId(s.id);
    setForm({ label: s.label, url: s.url, sort_order: String(s.sort_order) });
    setIconFile(null);
    setIconPreview(s.icon_url);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.label || !form.url) {
      toast({ title: "Preencha nome e URL", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let icon_url = iconPreview;
      if (iconFile) {
        icon_url = await uploadIcon(iconFile);
      }

      if (editingId) {
        await adminApi("update_shortcut", {
          shortcut_id: editingId,
          data: { label: form.label, url: form.url, icon_url, sort_order: Number(form.sort_order) },
        });
        toast({ title: "Atalho atualizado!" });
      } else {
        await adminApi("create_shortcut", {
          label: form.label, url: form.url, icon_url, sort_order: Number(form.sort_order),
        });
        toast({ title: "Atalho criado!" });
      }
      setShowForm(false);
      loadShortcuts();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi("delete_shortcut", { shortcut_id: deleteId });
      toast({ title: "Atalho removido!" });
      setDeleteId(null);
      loadShortcuts();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const toggleActive = async (s: Shortcut) => {
    try {
      await adminApi("update_shortcut", { shortcut_id: s.id, data: { is_active: !s.is_active } });
      loadShortcuts();
    } catch (e) { console.error(e); }
  };

  // Spin grant
  const searchUsers = async () => {
    if (!spinSearch.trim()) return;
    setSpinSearching(true);
    try {
      const data = await adminApi("list_users", { search: spinSearch, per_page: 5 });
      setSpinResults((data.users || []).map((u: any) => ({ user_id: u.user_id, full_name: u.full_name, email: u.email })));
    } catch (e) { console.error(e); }
    finally { setSpinSearching(false); }
  };

  const grantSpin = async () => {
    if (!spinUser) return;
    setSpinGranting(true);
    try {
      await adminApi("grant_spin", { user_id: spinUser.user_id, quantity: Number(spinQty) });
      toast({ title: "Rodada(s) concedida(s)!", description: `${spinQty} rodada(s) para ${spinUser.full_name || spinUser.email}` });
      setShowSpinDialog(false);
      setSpinUser(null);
      setSpinSearch("");
      setSpinResults([]);
      setSpinQty("1");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSpinGranting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Atalhos & Roleta</h1>
          <p className="text-muted-foreground text-sm">Gerencie atalhos do dashboard e rodadas grátis</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSpinDialog(true)} variant="outline" className="gap-2">
            <Ticket className="w-4 h-4" />
            Dar Rodada
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Atalho
          </Button>
        </div>
      </div>

      {/* Shortcuts List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atalhos do Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          {shortcuts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum atalho cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {shortcuts.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                  {s.icon_url ? (
                    <img src={s.icon_url} alt={s.label} className="w-10 h-10 rounded-xl object-contain bg-card border border-border/50 p-1" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center">
                      <Image className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.label}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />{s.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                    <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">
                      {s.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shortcut Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Atalho" : "Novo Atalho"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Atalho</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Roleta" />
            </div>
            <div>
              <Label>URL de Destino</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Ex: /roleta ou https://..." />
            </div>
            <div>
              <Label>Ordem de Exibição</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </div>
            <div>
              <Label>Logo / Ícone</Label>
              <div className="flex items-center gap-3 mt-1">
                {iconPreview && (
                  <img src={iconPreview} alt="Preview" className="w-14 h-14 rounded-xl object-contain bg-muted border p-1" />
                )}
                <Input type="file" accept="image/*" onChange={handleIconChange} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Qualquer tamanho, será exibido no mesmo formato dos outros ícones.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atalho?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grant Spin Dialog */}
      <Dialog open={showSpinDialog} onOpenChange={setShowSpinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar Rodada Grátis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Buscar Usuário</Label>
              <div className="flex gap-2">
                <Input
                  value={spinSearch}
                  onChange={(e) => setSpinSearch(e.target.value)}
                  placeholder="Nome, email ou CPF..."
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                />
                <Button onClick={searchUsers} disabled={spinSearching} variant="outline" size="icon">
                  {spinSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {spinResults.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {spinResults.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => setSpinUser(u)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                      spinUser?.user_id === u.user_id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                    }`}
                  >
                    <p className="font-medium">{u.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </button>
                ))}
              </div>
            )}

            {spinUser && (
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-sm font-medium">{spinUser.full_name || spinUser.email}</p>
                <div className="mt-2">
                  <Label>Quantidade de Rodadas</Label>
                  <Input type="number" min="1" max="10" value={spinQty} onChange={(e) => setSpinQty(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSpinDialog(false)}>Cancelar</Button>
            <Button onClick={grantSpin} disabled={!spinUser || spinGranting}>
              {spinGranting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ticket className="w-4 h-4 mr-2" />}
              Conceder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
