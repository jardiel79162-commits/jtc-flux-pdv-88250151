import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Search, Loader2, Gift, Clock, User } from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";

interface UserResult {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface SpinRecord {
  id: string;
  user_id: string;
  prize_label: string | null;
  prize_days: number | null;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null };
}

interface GrantLog {
  id: string;
  user_id: string | null;
  description: string | null;
  metadata: { target_user_id?: string; quantity?: number } | null;
  created_at: string;
}

export default function AdminSpins() {
  const { toast } = useToast();

  // Grant spin
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [spinSearch, setSpinSearch] = useState("");
  const [spinResults, setSpinResults] = useState<UserResult[]>([]);
  const [spinSearching, setSpinSearching] = useState(false);
  const [spinUser, setSpinUser] = useState<UserResult | null>(null);
  const [spinQty, setSpinQty] = useState("1");
  const [spinGranting, setSpinGranting] = useState(false);

  // History
  const [history, setHistory] = useState<SpinRecord[]>([]);
  const [grantedLogs, setGrantedLogs] = useState<GrantLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await adminApi("list_spin_history", { per_page: 50 });
      setHistory(data.spins || []);
      setGrantedLogs(data.granted_logs || []);
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  };

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
      setShowGrantDialog(false);
      setSpinUser(null);
      setSpinSearch("");
      setSpinResults([]);
      setSpinQty("1");
      loadHistory();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSpinGranting(false); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Roleta de Prêmios</h1>
          <p className="text-muted-foreground text-sm">Conceda rodadas e veja o histórico</p>
        </div>
        <Button onClick={() => setShowGrantDialog(true)} className="gap-2">
          <Ticket className="w-4 h-4" />
          Dar Rodada
        </Button>
      </div>

      <Tabs defaultValue="granted" className="w-full">
        <TabsList>
          <TabsTrigger value="granted" className="gap-2"><Gift className="w-4 h-4" /> Rodadas Concedidas</TabsTrigger>
          <TabsTrigger value="used" className="gap-2"><Clock className="w-4 h-4" /> Rodadas Usadas</TabsTrigger>
        </TabsList>

        <TabsContent value="granted">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Rodadas Concedidas pelo Admin</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : grantedLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhuma rodada concedida ainda.</p>
              ) : (
                <div className="space-y-2">
                  {grantedLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Ticket className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{log.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Qtd: {log.metadata?.quantity || 1} • {formatDate(log.created_at)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {log.metadata?.quantity || 1} rodada(s)
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="used">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rodadas Utilizadas (Prêmios Ganhos)</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : history.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhuma rodada utilizada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((spin) => (
                    <div key={spin.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{spin.profiles?.full_name || spin.profiles?.email || "Usuário"}</p>
                        <p className="text-xs text-muted-foreground">
                          Prêmio: <span className="font-semibold text-foreground">{spin.prize_label || "—"}</span>
                          {spin.prize_days ? ` (${spin.prize_days} dias)` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={spin.prize_days ? "default" : "secondary"} className="text-xs">
                          {spin.prize_label || "Sem prêmio"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(spin.used_at || spin.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Grant Spin Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
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
            <Button variant="outline" onClick={() => setShowGrantDialog(false)}>Cancelar</Button>
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
