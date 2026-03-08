import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserX, CreditCard, Loader2, Store, UserCheck } from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Stats {
  users: number;
  blocked: number;
  payments: number;
  revenue: number;
  totalProducts: number;
  totalSales: number;
  salesRevenue: number;
  totalStores: number;
  activeSubscriptions: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, blocked: 0, payments: 0, revenue: 0, totalProducts: 0, totalSales: 0, salesRevenue: 0, totalStores: 0, activeSubscriptions: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await adminApi("get_stats");
      setStats(data.stats);
      setRecentLogs(data.recentLogs || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const statCards = [
    { title: "Empresas", value: stats.users, icon: Users, color: "text-blue-500", link: "/admin/empresas" },
    { title: "Suspensos", value: stats.blocked, icon: UserX, color: "text-red-500", link: "/admin/empresas" },
    { title: "Assinaturas Ativas", value: stats.activeSubscriptions, icon: UserCheck, color: "text-emerald-500", link: "/admin/assinaturas" },
    { title: "Lojas", value: stats.totalStores, icon: Store, color: "text-purple-500", link: "/admin/empresas" },
    { title: "Produtos (total)", value: stats.totalProducts, icon: Package, color: "text-orange-500" },
    { title: "Vendas (total)", value: stats.totalSales, icon: ShoppingCart, color: "text-cyan-500" },
    { title: "Receita Vendas", value: `R$ ${stats.salesRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-500" },
    { title: "Receita Assinaturas", value: `R$ ${stats.revenue.toFixed(2)}`, icon: CreditCard, color: "text-amber-500", link: "/admin/pagamentos" },
  ];

  const eventLabels: Record<string, string> = {
    user_blocked: "Usuário suspenso", user_unblocked: "Reativado", user_deleted: "Deletado",
    user_updated: "Atualizado", maintenance_updated: "Manutenção", admin_setup: "Admin configurado",
    user_login: "Login", subscription_extended: "Assinatura estendida",
    product_deleted: "Produto deletado", sale_deleted: "Venda deletada", password_reset: "Senha redefinida",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">Visão geral completa do JTC FLUX</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Card key={card.title} className={`${(card as any).link ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`} onClick={() => (card as any).link && navigate((card as any).link)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{card.value}</div>
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
                    <p className="text-sm font-medium">{eventLabels[log.event_type] || log.event_type}</p>
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
