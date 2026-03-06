import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Package, ShoppingCart, AlertTriangle, Calendar, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { DashboardSkeleton } from "@/components/skeletons";
import { usePermissions } from "@/hooks/usePermissions";
import { QUICK_ACTION_PERMISSIONS } from "@/lib/permissions";

// Importar imagens de ações rápidas
import quickActionProdutos from "@/assets/quick-action-produtos.png";
import quickActionVenda from "@/assets/quick-action-venda.png";
import quickActionClientes from "@/assets/quick-action-clientes.png";
import quickActionHistorico from "@/assets/quick-action-historico.png";
import quickActionRelatorios from "@/assets/quick-action-relatorios.png";
import quickActionConfiguracoes from "@/assets/quick-action-configuracoes.png";
import quickActionAssinatura from "@/assets/quick-action-assinatura.png";
import quickActionFornecedores from "@/assets/quick-action-fornecedores.jpg";
import quickActionCalculadora from "@/assets/quick-action-calculadora.png";
import quickActionBonus from "@/assets/gift-box.jpg";
import PageLoader from "@/components/PageLoader";

interface DashboardData {
  salesToday: number;
  salesMonth: number;
  lowStockProducts: number;
  recentSales: number;
  subscriptionStatus: "active" | "trial" | "expired";
  trialDaysLeft?: number;
  subscriptionDaysLeft?: number;
  subscriptionEndDate?: Date;
  quickActionsEnabled: boolean;
  hideTrialMessage: boolean;
}

interface CustomShortcut {
  id: string;
  label: string;
  url: string;
  icon_url: string | null;
  sort_order: number;
}

const quickActions = [
  { label: "Produtos", path: "/produtos", image: quickActionProdutos },
  { label: "Venda", path: "/pdv", image: quickActionVenda },
  { label: "Clientes", path: "/clientes", image: quickActionClientes },
  { label: "Fornecedores", path: "/fornecedores", image: quickActionFornecedores },
  { label: "Histórico", path: "/historico", image: quickActionHistorico },
  { label: "Relatórios", path: "/relatorios", image: quickActionRelatorios },
  { label: "Configurações", path: "/configuracoes", image: quickActionConfiguracoes },
  { label: "Assinatura", path: "/assinatura", image: quickActionAssinatura },
  { label: "Calculadora", path: "/calculadora", image: quickActionCalculadora },
  { label: "Bônus", path: "/resgate-semanal", image: quickActionBonus },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const Dashboard = () => {
  const { hasPermission, isAdmin, getEffectiveUserId } = usePermissions();
  const [data, setData] = useState<DashboardData>({
    salesToday: 0,
    salesMonth: 0,
    lowStockProducts: 0,
    recentSales: 0,
    subscriptionStatus: "trial",
    trialDaysLeft: 0,
    subscriptionDaysLeft: 0,
    subscriptionEndDate: undefined,
    quickActionsEnabled: false,
    hideTrialMessage: false,
  });
  const [loading, setLoading] = useState(true);
  const [customShortcuts, setCustomShortcuts] = useState<CustomShortcut[]>([]);

  // Filter quick actions by permissions
  const filteredQuickActions = quickActions.filter((action) => {
    const permKey = QUICK_ACTION_PERMISSIONS[action.path];
    if (permKey) return hasPermission(permKey);
    return true;
  });

  const loadDashboardData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const effectiveUserId = getEffectiveUserId() || user.id;
      const isMissingTableError = (err: any) => err?.code === "PGRST205";

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Run ALL queries in parallel
      const [profileRes, storeSettingsRes, salesTodayRes, salesMonthRes, productsRes, recentSalesRes, shortcutsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("created_at, subscription_ends_at, trial_ends_at")
          .eq("user_id", effectiveUserId)
          .maybeSingle(),
        supabase.from("store_settings").select("quick_actions_enabled, hide_trial_message").eq("user_id", effectiveUserId).maybeSingle(),
        supabase.from("sales").select("total_amount").eq("user_id", effectiveUserId).gte("created_at", today.toISOString()),
        supabase.from("sales").select("total_amount").eq("user_id", effectiveUserId).gte("created_at", firstDayOfMonth.toISOString()),
        supabase.from("products").select("id, stock_quantity, min_stock_quantity").eq("user_id", effectiveUserId),
        supabase.from("sales").select("id").eq("user_id", effectiveUserId).order("created_at", { ascending: false }).limit(5),
        supabase.from("custom_shortcuts" as any).select("id, label, url, icon_url, sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
      ]);

      // Set custom shortcuts
      if (shortcutsRes.data) {
        setCustomShortcuts(shortcutsRes.data as any[]);
      }

      let quickActionsEnabled = true;
      let hideTrialMessage = false;
      if (!storeSettingsRes.error && storeSettingsRes.data) {
        quickActionsEnabled = storeSettingsRes.data.quick_actions_enabled ?? true;
        hideTrialMessage = storeSettingsRes.data.hide_trial_message ?? false;
      }

      const now = new Date();
      const fallbackTrialEnd = profileRes.data?.created_at
        ? new Date(new Date(profileRes.data.created_at).getTime() + 3 * 24 * 60 * 60 * 1000)
        : null;

      const paidEnd = profileRes.data?.subscription_ends_at ? new Date(profileRes.data.subscription_ends_at) : null;
      const trialEnd = profileRes.data?.trial_ends_at ? new Date(profileRes.data.trial_ends_at) : fallbackTrialEnd;

      let trialDaysLeft = 0;
      let subscriptionDaysLeft = 0;
      let subscriptionEndDate: Date | undefined = undefined;
      let subscriptionStatus: "active" | "trial" | "expired" = "expired";

      if (paidEnd && paidEnd > now) {
        subscriptionStatus = "active";
        subscriptionEndDate = paidEnd;
        subscriptionDaysLeft = Math.max(0, Math.ceil((paidEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (trialEnd && trialEnd > now) {
        subscriptionStatus = "trial";
        subscriptionEndDate = trialEnd;
        trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        subscriptionDaysLeft = trialDaysLeft;
      }

      const totalToday = isMissingTableError(salesTodayRes.error)
        ? 0
        : (salesTodayRes.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0);

      const totalMonth = isMissingTableError(salesMonthRes.error)
        ? 0
        : (salesMonthRes.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0);

      const lowStockCount = isMissingTableError(productsRes.error)
        ? 0
        : (productsRes.data?.filter(
            (product) => product.stock_quantity <= (product.min_stock_quantity ?? 0)
          ).length || 0);

      setData({
        salesToday: isMissingTableError(salesTodayRes.error) ? 0 : totalToday,
        salesMonth: isMissingTableError(salesMonthRes.error) ? 0 : totalMonth,
        lowStockProducts: lowStockCount,
        recentSales: isMissingTableError(recentSalesRes.error) ? 0 : (recentSalesRes.data?.length || 0),
        subscriptionStatus,
        trialDaysLeft,
        subscriptionDaysLeft,
        subscriptionEndDate,
        quickActionsEnabled,
        hideTrialMessage,
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [getEffectiveUserId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const refresh = () => loadDashboardData();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const interval = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadDashboardData]);

  if (loading) {
    return (
      <PageLoader pageName="Dashboard">
        <DashboardSkeleton />
      </PageLoader>
    );
  }

  const metricCards = [
    {
      title: "Vendas Hoje",
      value: `R$ ${data.salesToday.toFixed(2)}`,
      subtitle: "Faturamento do dia",
      icon: TrendingUp,
      gradient: "from-primary to-primary/70",
      iconClass: "icon-gradient-primary",
    },
    {
      title: "Vendas do Mês",
      value: `R$ ${data.salesMonth.toFixed(2)}`,
      subtitle: "Faturamento mensal",
      icon: ShoppingCart,
      gradient: "from-accent to-accent/70",
      iconClass: "icon-gradient-accent",
    },
    {
      title: "Estoque Baixo",
      value: data.lowStockProducts.toString(),
      subtitle: "Produtos precisam reposição",
      icon: AlertTriangle,
      gradient: data.lowStockProducts > 0 ? "from-warning to-warning/70" : "from-muted-foreground to-muted-foreground/70",
      iconClass: "icon-gradient-warning",
    },
    {
      title: "Últimas Vendas",
      value: data.recentSales.toString(),
      subtitle: "Transações recentes",
      icon: Package,
      gradient: "from-info to-info/70",
      iconClass: "icon-gradient-info",
    },
  ];

  return (
    <PageLoader pageName="Dashboard">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="page-container"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="page-header">
          <div className="page-title-block">
            <div className="page-title-icon">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="page-title-text">Dashboard</h1>
              <p className="page-subtitle">Visão geral do seu negócio</p>
            </div>
          </div>
        </motion.div>

        {/* Status da Assinatura */}
        {!data.hideTrialMessage && data.subscriptionStatus === "trial" && (
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5" />
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-3xl" />
              <CardHeader className="relative pb-2">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                        Período Gratuito Ativo
                      </CardTitle>
                      <CardDescription className="text-muted-foreground/80">
                        Você tem {data.trialDaysLeft} {data.trialDaysLeft === 1 ? 'dia grátis' : 'dias grátis'} disponíveis
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md px-4 py-1.5 text-sm font-semibold animate-pulse">
                    {data.trialDaysLeft} {data.trialDaysLeft === 1 ? 'dia' : 'dias'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative pt-2">
                <Link to="/assinatura">
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:scale-[1.02]">
                    Assinar Agora
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!data.hideTrialMessage && data.subscriptionStatus === "expired" && (
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-500/10 via-rose-500/10 to-pink-500/10 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-rose-500/5" />
              <CardHeader className="relative pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 shadow-lg">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                      Assinatura Expirada
                    </CardTitle>
                    <CardDescription className="text-muted-foreground/80">
                      Renove para continuar usando o sistema
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative pt-2">
                <Link to="/assinatura">
                  <Button className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]">
                    Renovar Assinatura
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!data.hideTrialMessage && data.subscriptionStatus === "active" && (
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5" />
              <CardHeader className="relative pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                        Assinatura Ativa
                      </CardTitle>
                      <CardDescription className="text-muted-foreground/80">
                        Você tem {data.subscriptionDaysLeft} {data.subscriptionDaysLeft === 1 ? 'dia' : 'dias'} disponíveis
                        {data.subscriptionEndDate ? ` • até ${data.subscriptionEndDate.toLocaleDateString('pt-BR')}` : ''}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-md px-4 py-1.5 text-sm font-semibold">
                      {data.subscriptionDaysLeft} {data.subscriptionDaysLeft === 1 ? 'dia' : 'dias'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">restantes</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative pt-2">
                <Link to="/assinatura">
                  <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                    Renovar Plano
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Ações Rápidas */}
        {data.quickActionsEnabled && (
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2.5 md:gap-3">
              {filteredQuickActions.map((action) => (
                <Link key={action.path} to={action.path}>
                  <motion.div
                    whileHover={{ scale: 1.08, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div className="w-13 h-13 md:w-16 md:h-16 rounded-2xl bg-card border border-border/50 p-2 shadow-sm group-hover:shadow-lg group-hover:border-primary/30 transition-all duration-300">
                      <img 
                        src={action.image} 
                        alt={action.label} 
                        className="w-full h-full object-contain pointer-events-auto"
                      />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                      {action.label}
                    </span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}


        {/* Cards de Métricas */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.title}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Card className="metric-card h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-4 md:p-5 md:pb-1">
                    <CardTitle className="text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">{metric.title}</CardTitle>
                    <div className={metric.iconClass}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 md:p-5 md:pt-0">
                    <div className={`stat-value from-foreground to-muted-foreground`}>
                      {metric.value}
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{metric.subtitle}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </PageLoader>
  );
};

export default Dashboard;
