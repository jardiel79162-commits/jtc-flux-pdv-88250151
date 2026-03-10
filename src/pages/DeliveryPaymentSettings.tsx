import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Save, Loader2 } from "lucide-react";
import PageLoader from "@/components/PageLoader";
import AnimatedPage from "@/components/AnimatedPage";

export default function DeliveryPaymentSettings() {
  const { toast } = useToast();
  const { getEffectiveUserId } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    pix_enabled: false,
    cash_enabled: true,
    card_on_delivery_enabled: false,
    mercado_pago_enabled: false,
    pix_key: "",
    pix_receiver_name: "",
    pix_bank: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const effectiveId = getEffectiveUserId() || session.user.id;

    const { data } = await supabase
      .from("delivery_payment_settings")
      .select("*")
      .eq("user_id", effectiveId)
      .maybeSingle();

    if (data) {
      setSettings({
        pix_enabled: data.pix_enabled ?? false,
        cash_enabled: data.cash_enabled ?? true,
        card_on_delivery_enabled: data.card_on_delivery_enabled ?? false,
        mercado_pago_enabled: data.mercado_pago_enabled ?? false,
        pix_key: data.pix_key || "",
        pix_receiver_name: data.pix_receiver_name || "",
        pix_bank: data.pix_bank || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }
    const effectiveId = getEffectiveUserId() || session.user.id;

    const payload = { ...settings, user_id: effectiveId };

    const { data: existing } = await supabase
      .from("delivery_payment_settings")
      .select("id")
      .eq("user_id", effectiveId)
      .maybeSingle();

    let error;
    if (existing) {
      const res = await supabase.from("delivery_payment_settings").update(payload).eq("user_id", effectiveId);
      error = res.error;
    } else {
      const res = await supabase.from("delivery_payment_settings").insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } else {
      toast({ title: "Configurações de pagamento salvas!" });
    }
  };

  if (loading) {
    return (
      <PageLoader pageName="Pagamentos Delivery">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </PageLoader>
    );
  }

  return (
    <PageLoader pageName="Pagamentos Delivery">
      <AnimatedPage>
        <div className="space-y-6 max-w-2xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6" /> Pagamentos do Delivery
            </h1>
            <p className="text-muted-foreground text-sm">Configure as formas de pagamento disponíveis no seu catálogo</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formas de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Dinheiro</p>
                  <p className="text-xs text-muted-foreground">Pagamento em espécie na entrega</p>
                </div>
                <Switch checked={settings.cash_enabled} onCheckedChange={(v) => setSettings({ ...settings, cash_enabled: v })} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">PIX</p>
                  <p className="text-xs text-muted-foreground">Pagamento via PIX com QR Code</p>
                </div>
                <Switch checked={settings.pix_enabled} onCheckedChange={(v) => setSettings({ ...settings, pix_enabled: v })} />
              </div>

              {settings.pix_enabled && (
                <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Chave PIX</Label>
                    <Input value={settings.pix_key} onChange={(e) => setSettings({ ...settings, pix_key: e.target.value })} placeholder="CPF, e-mail, telefone ou chave aleatória" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nome do Recebedor</Label>
                    <Input value={settings.pix_receiver_name} onChange={(e) => setSettings({ ...settings, pix_receiver_name: e.target.value })} placeholder="Nome que aparece no PIX" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Banco</Label>
                    <Input value={settings.pix_bank} onChange={(e) => setSettings({ ...settings, pix_bank: e.target.value })} placeholder="Ex: Nubank, Bradesco" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Cartão na Entrega</p>
                  <p className="text-xs text-muted-foreground">Maquininha na entrega</p>
                </div>
                <Switch checked={settings.card_on_delivery_enabled} onCheckedChange={(v) => setSettings({ ...settings, card_on_delivery_enabled: v })} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Mercado Pago</p>
                  <p className="text-xs text-muted-foreground">Pagamento online integrado</p>
                </div>
                <Switch checked={settings.mercado_pago_enabled} onCheckedChange={(v) => setSettings({ ...settings, mercado_pago_enabled: v })} />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Configurações
          </Button>
        </div>
      </AnimatedPage>
    </PageLoader>
  );
}
