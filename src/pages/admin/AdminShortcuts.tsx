import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Loader2, ExternalLink, Image, RefreshCw } from "lucide-react";
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

export default function AdminShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", url: "" });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadShortcuts(); }, []);

  const loadShortcuts = async () => {
    setLoading(true);
    try {
      const data = await adminApi("list_shortcuts");
      setShortcuts(data.shortcuts || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await adminApi("sync_default_shortcuts");
      setShortcuts(data.shortcuts || []);
      toast({ title: `Sincronizado! ${data.added} atalhos adicionados.` });
    } catch (e: any) {
      toast({ title: "Erro ao sincronizar", description: e.message, variant: "destructive" });
    } finally { setSyncing(false); }
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
    setForm({ label: "", url: "" });
    setIconFile(null);
    setIconPreview(null);
    setShowForm(true);
  };

  const openEdit = (s: Shortcut) => {
    setEditingId(s.id);
    setForm({ label: s.label, url: s.url });
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
      if (iconFile) icon_url = await uploadIcon(iconFile);

      if (editingId) {
        await adminApi("update_shortcut", {
          shortcut_id: editingId,
          data: { label: form.label, url: form.url, icon_url },
        });
        toast({ title: "Atalho atualizado!" });
      } else {
        await adminApi("create_shortcut", {
          label: form.label, url: form.url, icon_url, sort_order: shortcuts.length,
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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Atalhos do Dashboard</h1>
          <p className="text-muted-foreground text-sm">Gerencie os ícones de atalho do dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar Padrões
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Atalho
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atalhos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {shortcuts.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-foreground text-sm">Nenhum atalho cadastrado.</p>
              <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                Sincronizar atalhos padrão
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {shortcuts.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
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
    </div>
  );
}
