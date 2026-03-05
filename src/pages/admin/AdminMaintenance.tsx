import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";

export default function AdminMaintenance() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const data = await adminApi("get_maintenance");
      if (data.settings) {
        setEnabled(data.settings.maintenance_mode || false);
        setMessage(data.settings.maintenance_message || "");
        setImageUrl(data.settings.maintenance_image_url || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi("update_maintenance", {
        enabled,
        message,
        image_url: imageUrl || null,
      });
      toast({ title: "Configuração salva", description: enabled ? "Modo manutenção ativado." : "Modo manutenção desativado." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Modo Manutenção</h1>
        <p className="text-muted-foreground">Controle o acesso ao sistema durante manutenções</p>
      </div>

      {enabled && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            Modo manutenção está ATIVO. Todos os usuários (exceto administradores) estão bloqueados.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Configurações
          </CardTitle>
          <CardDescription>
            Quando ativado, apenas administradores conseguem acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Ativar Manutenção</Label>
              <p className="text-sm text-muted-foreground">Bloqueia o acesso de todos os usuários</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>Mensagem para os usuários</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Sistema temporariamente em manutenção..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>URL da imagem (opcional)</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.png"
            />
            {imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border max-w-xs">
                <img src={imageUrl} alt="Preview" className="w-full h-auto" onError={(e) => (e.currentTarget.style.display = "none")} />
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview da tela de manutenção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-8 text-center space-y-4">
            {imageUrl ? (
              <img src={imageUrl} alt="Manutenção" className="w-24 h-24 mx-auto object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            ) : (
              <Shield className="w-16 h-16 mx-auto text-muted-foreground" />
            )}
            <h2 className="text-lg font-bold">Sistema em Manutenção</h2>
            <p className="text-sm text-muted-foreground">{message || "Sistema temporariamente em manutenção. Voltaremos em breve."}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
