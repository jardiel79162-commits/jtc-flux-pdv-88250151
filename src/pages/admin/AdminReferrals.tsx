import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, CheckCircle2, XCircle, AlertTriangle, Clock, Loader2, Users, Eye } from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string | null;
  referral_code: string;
  ip_address: string | null;
  device_fingerprint: string | null;
  user_agent: string | null;
  status: string;
  fraud_score: number;
  fraud_reasons: string[];
  reward_applied: boolean;
  created_at: string;
  reviewed_at: string | null;
  referrer_name: string;
  referrer_email: string;
  referred_name: string;
  referred_email: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  under_review: number;
  total: number;
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, under_review: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, [filter, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [refData, statsData] = await Promise.all([
        adminApi("list_referrals", { status: filter, page, per_page: 20 }),
        adminApi("get_referral_stats"),
      ]);
      setReferrals(refData.referrals || []);
      setTotal(refData.total || 0);
      setStats(statsData.stats || { pending: 0, approved: 0, rejected: 0, under_review: 0, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await adminApi("approve_referral", { referral_id: id });
      toast({ title: "Indicação aprovada!", description: "Recompensa de 30 dias aplicada para ambos os usuários." });
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message || "Erro ao aprovar" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await adminApi("reject_referral", { referral_id: id });
      toast({ title: "Indicação rejeitada", description: "A indicação foi rejeitada." });
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message || "Erro ao rejeitar" });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Aprovado</Badge>;
      case "rejected": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejeitado</Badge>;
      case "under_review": return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Em Análise</Badge>;
      default: return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Pendente</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 71) return "text-red-400";
    if (score >= 41) return "text-amber-400";
    return "text-emerald-400";
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const statCards = [
    { label: "Total", value: stats.total, icon: Users, color: "text-blue-500" },
    { label: "Pendentes", value: stats.pending, icon: Clock, color: "text-blue-400" },
    { label: "Em Análise", value: stats.under_review, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Aprovados", value: stats.approved, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Rejeitados", value: stats.rejected, icon: XCircle, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Antifraude - Indicações
        </h1>
        <p className="text-muted-foreground">Gerencie e revise indicações suspeitas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="under_review">Em Análise</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{total} indicações</span>
      </div>

      {/* Referrals list */}
      {referrals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhuma indicação encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {referrals.map((ref) => (
            <Card key={ref.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {getStatusBadge(ref.status)}
                      <span className={`text-sm font-bold ${getScoreColor(ref.fraud_score)}`}>
                        Score: {ref.fraud_score}
                      </span>
                      {ref.reward_applied && (
                        <Badge variant="outline" className="text-xs">Recompensa aplicada</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Indicou: </span>
                        <span className="font-medium">{ref.referrer_name}</span>
                        <span className="text-xs text-muted-foreground ml-1">({ref.referrer_email})</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Indicado: </span>
                        <span className="font-medium">{ref.referred_name}</span>
                        <span className="text-xs text-muted-foreground ml-1">({ref.referred_email})</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(ref.created_at), "dd/MM/yyyy HH:mm")} • Código: {ref.referral_code}
                    </div>

                    {/* Expandable details */}
                    {expandedId === ref.id && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2 text-xs">
                        <div><span className="font-medium">IP:</span> {ref.ip_address || 'N/A'}</div>
                        <div><span className="font-medium">Fingerprint:</span> <span className="font-mono break-all">{ref.device_fingerprint?.substring(0, 32) || 'N/A'}...</span></div>
                        <div><span className="font-medium">User Agent:</span> <span className="break-all">{ref.user_agent || 'N/A'}</span></div>
                        {ref.fraud_reasons && ref.fraud_reasons.length > 0 && (
                          <div>
                            <span className="font-medium text-amber-400">Motivos de fraude:</span>
                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                              {ref.fraud_reasons.map((reason, i) => (
                                <li key={i} className="text-red-400">{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {ref.reviewed_at && (
                          <div><span className="font-medium">Revisado em:</span> {format(new Date(ref.reviewed_at), "dd/MM/yyyy HH:mm")}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {(ref.status === "pending" || ref.status === "under_review") && (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-emerald-500 border-emerald-500/30" disabled={actionLoading === ref.id}>
                              {actionLoading === ref.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Aprovar indicação?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso vai adicionar 30 dias de assinatura para o usuário que indicou e o indicado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleApprove(ref.id)}>Aprovar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-500 border-red-500/30" disabled={actionLoading === ref.id}>
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Rejeitar indicação?</AlertDialogTitle>
                              <AlertDialogDescription>
                                A indicação será rejeitada e nenhuma recompensa será concedida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleReject(ref.id)} className="bg-destructive text-destructive-foreground">Rejeitar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground self-center">Página {page} de {Math.ceil(total / 20)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}
