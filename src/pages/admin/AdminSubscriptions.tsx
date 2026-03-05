import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, MinusCircle, CalendarPlus } from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [extendDialog, setExtendDialog] = useState<any>(null);
  const [days, setDays] = useState("30");
  const { toast } = useToast();

  useEffect(() => { loadSubs(); }, [page]);

  const loadSubs = async () => {
    setLoading(true);
    try {
      const data = await adminApi("list_subscriptions", { filter: filter || undefined, page, per_page: 20 });
      setSubs(data.subscriptions || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFilter = () => { setPage(1); loadSubs(); };

  const handleExtend = async () => {
    if (!extendDialog) return;
    try {
      await adminApi("extend_subscription", { user_id: extendDialog.user_id, days: parseInt(days) });
      toast({ title: `Assinatura estendida em ${days} dias` });
      setExtendDialog(null);
      loadSubs();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const handleRevoke = async (userId: string) => {
    try {
      await adminApi("revoke_subscription", { user_id: userId });
      toast({ title: "Assinatura revogada" });
      loadSubs();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const getStatus = (sub: any) => {
    const now = new Date();
    if (sub.subscription_ends_at && new Date(sub.subscription_ends_at) > now) return { label: "Ativo", variant: "default" as const };
    if (sub.trial_ends_at && new Date(sub.trial_ends_at) > now) return { label: "Trial", variant: "secondary" as const };
    if (sub.subscription_ends_at) return { label: "Expirado", variant: "destructive" as const };
    return { label: "Sem plano", variant: "outline" as const };
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciar Assinaturas</h1>
        <p className="text-muted-foreground">{total} registros</p>
      </div>

      <div className="flex gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
            <SelectItem value="trial">Em Trial</SelectItem>
            <SelectItem value="no_sub">Sem assinatura</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleFilter}>Filtrar</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Usuário</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Expira em</th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">Trial até</th>
                    <th className="text-right p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub: any) => {
                    const st = getStatus(sub);
                    return (
                      <tr key={sub.user_id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-medium">{sub.full_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{sub.email}</p>
                        </td>
                        <td className="p-3"><Badge variant={st.variant} className="text-xs">{st.label}</Badge></td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">
                          {sub.subscription_ends_at ? format(new Date(sub.subscription_ends_at), "dd/MM/yyyy") : "-"}
                        </td>
                        <td className="p-3 hidden lg:table-cell text-muted-foreground">
                          {sub.trial_ends_at ? format(new Date(sub.trial_ends_at), "dd/MM/yyyy") : "-"}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => { setExtendDialog(sub); setDays("30"); }}>
                              <CalendarPlus className="w-3 h-3 mr-1" /> Estender
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleRevoke(sub.user_id)} title="Revogar">
                              <MinusCircle className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {subs.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum registro encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground self-center">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
        </div>
      )}

      <Dialog open={!!extendDialog} onOpenChange={(open) => !open && setExtendDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Estender Assinatura - {extendDialog?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dias para adicionar</Label>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} min="1" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[7, 15, 30, 90, 365].map((d) => (
                <Button key={d} size="sm" variant={days === String(d) ? "default" : "outline"} onClick={() => setDays(String(d))}>{d} dias</Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog(null)}>Cancelar</Button>
            <Button onClick={handleExtend}>Estender</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
