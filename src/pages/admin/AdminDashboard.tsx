import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserX, CreditCard, DollarSign, Loader2 } from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";
import { format } from "date-fns";

interface Stats {
  users: number;
  blocked: number;
  payments: number;
  revenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, blocked: 0, payments: 0, revenue: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await adminApi("get_stats");
      setStats(data.stats);
      setRecentLogs(data.recentLogs || []);
    } catch (err) {
      console.error("Error loading admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { title: "Total de Usuários", value: stats.users, icon: Users, color: "text-blue-500" },
    { title: "Usuários Bloqueados", value: stats.blocked, icon: UserX, color: "text-red-500" },
    { title: "Total de Pagamentos", value: stats.payments, icon: CreditCard, color: "text-green-500" },
    { title: "Receita Total", value: `R$ ${stats.revenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-500" },
  ];

  const eventTypeLabels: Record<string, string> = {
    user_blocked: "Usuário bloqueado",
    user_unblocked: "Usuário desbloqueado",
    user_deleted: "Usuário deletado",
    user_updated: "Usuário atualizado",
    maintenance_updated: "Manutenção atualizada",
    admin_setup: "Admin configurado",
    user_login: "Login",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">Visão geral do sistema JTC FLUX</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma atividade registrada.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-start justify-between border-b border-border/50 pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {eventTypeLabels[log.event_type] || log.event_type}
                    </p>
                    <p className="text-xs text-muted-foreground">{log.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {format(new Date(log.created_at), "dd/MM HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
