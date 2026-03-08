import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, GripVertical, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  plan_key: string;
  name: string;
  price: number;
  days: number;
  features: string[];
  badge: string | null;
  is_active: boolean;
  sort_order: number;
}

const emptyPlan = {
  plan_key: "",
  name: "",
  price: 0,
  days: 30,
  features: [] as string[],
  badge: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<Partial<Plan> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const { toast } = useToast();

  const loadPlans = async () => {
    setLoading(true);
    // Admin can see all plans (active + inactive) via RLS
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("sort_order");
    if (!error && data) setPlans(data as unknown as Plan[]);
    setLoading(false);
  };

  useEffect(() => { loadPlans(); }, []);

  const openNew = () => {
    setIsNew(true);
    setEditDialog({ ...emptyPlan, sort_order: plans.length + 1 });
    setFeaturesText("");
  };

  const openEdit = (plan: Plan) => {
    setIsNew(false);
    setEditDialog({ ...plan });
    setFeaturesText((plan.features || []).join("\n"));
  };

  const handleSave = async () => {
    if (!editDialog?.plan_key || !editDialog?.name) {
      toast({ variant: "destructive", title: "Preencha a chave e o nome do plano" });
      return;
    }
    setSaving(true);
    const features = featuresText.split("\n").map(f => f.trim()).filter(Boolean);
    const payload = {
      plan_key: editDialog.plan_key,
      name: editDialog.name,
      price: Number(editDialog.price) || 0,
      days: Number(editDialog.days) || 30,
      features,
      badge: editDialog.badge || null,
      is_active: editDialog.is_active ?? true,
      sort_order: Number(editDialog.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (isNew) {
      ({ error } = await supabase.from("subscription_plans").insert(payload as any));
    } else {
      ({ error } = await supabase.from("subscription_plans").update(payload as any).eq("id", editDialog.id!));
    }

    if (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } else {
      toast({ title: isNew ? "Plano criado!" : "Plano atualizado!" });
      setEditDialog(null);
      loadPlans();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Plano excluído" });
      loadPlans();
    }
  };

  const toggleActive = async (plan: Plan) => {
    await supabase.from("subscription_plans").update({ is_active: !plan.is_active, updated_at: new Date().toISOString() } as any).eq("id", plan.id);
    loadPlans();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6" /> Gestão de Planos
          </h1>
          <p className="text-muted-foreground">Gerencie os planos de assinatura disponíveis para os usuários.</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Plano
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : plans.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum plano cadastrado.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${!plan.is_active ? "opacity-60" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Chave: {plan.plan_key}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {plan.badge && <Badge className="text-xs">{plan.badge}</Badge>}
                    <Badge variant={plan.is_active ? "default" : "secondary"} className="text-xs">
                      {plan.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">R$ {plan.price.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">/ {plan.days} dias</span>
                </div>
                <ul className="space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(plan)}>
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(plan)}>
                    {plan.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(plan.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de edição/criação */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "Criar Novo Plano" : "Editar Plano"}</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Chave (ID único)</Label>
                  <Input
                    value={editDialog.plan_key || ""}
                    onChange={(e) => setEditDialog({ ...editDialog, plan_key: e.target.value })}
                    placeholder="ex: 3_months"
                    disabled={!isNew}
                  />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={editDialog.name || ""}
                    onChange={(e) => setEditDialog({ ...editDialog, name: e.target.value })}
                    placeholder="Plano 3 Meses"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preço (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editDialog.price || 0}
                    onChange={(e) => setEditDialog({ ...editDialog, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Duração (dias)</Label>
                  <Input
                    type="number"
                    value={editDialog.days || 30}
                    onChange={(e) => setEditDialog({ ...editDialog, days: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <div>
                <Label>Badge (opcional)</Label>
                <Input
                  value={editDialog.badge || ""}
                  onChange={(e) => setEditDialog({ ...editDialog, badge: e.target.value })}
                  placeholder="ex: Mais Popular"
                />
              </div>
              <div>
                <Label>Benefícios (um por linha)</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder={"Acesso completo ao PDV\nGestão de produtos\nRelatórios detalhados"}
                />
              </div>
              <div>
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  value={editDialog.sort_order || 0}
                  onChange={(e) => setEditDialog({ ...editDialog, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editDialog.is_active ?? true}
                  onCheckedChange={(checked) => setEditDialog({ ...editDialog, is_active: checked })}
                />
                <Label>Plano ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isNew ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
