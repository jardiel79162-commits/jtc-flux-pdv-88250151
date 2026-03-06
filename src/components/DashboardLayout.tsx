import { useEffect, useState, useRef, useCallback } from "react";
import { AuriChat } from "@/components/AuriChat";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  History,
  Truck,
  Gift,
  Sun,
  Moon,
  RefreshCw,
  Shield,
  ShieldOff,
  Info,
} from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import logo from "@/assets/logo.jpg";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBlocker } from "@/components/SubscriptionBlocker";
import { useThemeContext } from "@/components/ThemeProvider";
import { PermissionsProvider, usePermissions } from "@/hooks/usePermissions";
import { MENU_PERMISSIONS, ROUTE_PERMISSIONS } from "@/lib/permissions";
import { useSystemColor } from "@/hooks/useSystemColor";

const DRAWER_WIDTH = 300;

const ALLOWED_WHEN_EXPIRED = ["/dashboard", "/configuracoes", "/assinatura"];

const DashboardLayoutInner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceImageUrl, setMaintenanceImageUrl] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const { isExpired, isTrial } = useSubscription();
  const { theme, toggleTheme } = useThemeContext();
  const { isAdmin, hasPermission, loading: permLoading } = usePermissions();
  useSystemColor();

  // Bloquear scroll do body quando o menu está aberto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Only call ensure-admin-role once per session
      const adminRoleCacheKey = `admin-role-ensured-${session.user.id}`;
      if (!sessionStorage.getItem(adminRoleCacheKey)) {
        supabase.functions.invoke("ensure-admin-role").then(() => {
          sessionStorage.setItem(adminRoleCacheKey, "1");
        }).catch(() => {});
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === "SIGNED_OUT") {
        sessionStorage.clear();
        navigate("/auth");
      }
      
      if (event === "SIGNED_IN") {
        const adminRoleCacheKey = `admin-role-ensured-${session?.user?.id}`;
        if (session && !sessionStorage.getItem(adminRoleCacheKey)) {
          supabase.functions.invoke("ensure-admin-role").then(() => {
            sessionStorage.setItem(adminRoleCacheKey, "1");
          }).catch(() => {});
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const [isSuspended, setIsSuspended] = useState(false);

  // Check maintenance mode, system admin status, and suspension
  useEffect(() => {
    if (!session) return;
    const check = async () => {
      try {
        const [settingsRes, adminRes, profileRes] = await Promise.all([
          supabase.from('system_settings_global' as any).select('*').maybeSingle() as any,
          (supabase.rpc as any)('is_system_admin', { _user_id: session.user.id }),
          supabase.from('profiles').select('is_blocked').eq('user_id', session.user.id).maybeSingle(),
        ]);
        const isSysAdmin = !!adminRes.data;
        setIsSystemAdmin(isSysAdmin);
        
        // If system admin, redirect to admin panel
        if (isSysAdmin) {
          navigate('/admin');
          return;
        }
        
        // Check suspension
        if (profileRes.data?.is_blocked) {
          setIsSuspended(true);
          return;
        }
        
        const settings = settingsRes.data as any;
        if (settings?.maintenance_mode && !isSysAdmin) {
          setMaintenanceMode(true);
          setMaintenanceMessage(settings.maintenance_message || '');
          setMaintenanceImageUrl(settings.maintenance_image_url);
        }
      } catch {}
    };
    check();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const allMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Package, label: "Produtos", path: "/produtos" },
    { icon: ShoppingCart, label: "Venda", path: "/pdv" },
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: Truck, label: "Fornecedores", path: "/fornecedores" },
    { icon: History, label: "Histórico", path: "/historico" },
    { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
    { icon: Settings, label: "Configurações", path: "/configuracoes" },
    { icon: CreditCard, label: "Assinatura", path: "/assinatura" },
    { icon: Gift, label: "Resgate Semanal", path: "/resgate-semanal" },
    { icon: Info, label: "Sobre", path: "/sobre" },
    ...(isSystemAdmin ? [{ icon: Shield, label: "Painel Admin", path: "/admin" }] : []),
  ];

  const menuItems = allMenuItems.filter((item) => {
    if (item.path === "/dashboard") return true;
    const permKey = MENU_PERMISSIONS[item.path];
    if (permKey) return hasPermission(permKey);
    return true;
  });

  useEffect(() => {
    if (permLoading || isAdmin) return;
    const path = location.pathname;
    if (path === "/dashboard") return;

    let requiredPerm = ROUTE_PERMISSIONS[path];
    if (!requiredPerm) {
      for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
        if (path.startsWith(route)) {
          requiredPerm = perm;
          break;
        }
      }
    }

    if (requiredPerm && !hasPermission(requiredPerm)) {
      navigate("/dashboard");
    }
  }, [location.pathname, permLoading, isAdmin, hasPermission, navigate]);

  if (loading || !user || !session || permLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldOff className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Conta Suspensa</h1>
          <p className="text-muted-foreground">
            Sua conta foi suspensa pelo administrador do sistema. Se você acredita que isso é um erro, entre em contato com o suporte.
          </p>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  if (maintenanceMode) {
    return <MaintenanceScreen message={maintenanceMessage} imageUrl={maintenanceImageUrl} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header com glassmorphism */}
      <header className="fixed top-0 left-0 right-0 h-16 z-40 flex items-center justify-between px-4 border-b border-border/50 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
        <Link to="/dashboard" className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="relative">
            <img src={logo} alt="JTC FluxPDV Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm pointer-events-auto" />
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 -z-10 blur-sm" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            JTC FluxPDV
          </h1>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground rounded-xl hover:bg-muted/80">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(0)} className="text-muted-foreground rounded-xl hover:bg-muted/80">
            <RefreshCw className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="rounded-xl hover:bg-muted/80">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </header>

      {/* Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop - bloqueia interação com conteúdo atrás */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm touch-none"
              onClick={() => setIsMobileMenuOpen(false)}
              onTouchMove={(e) => e.preventDefault()}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -DRAWER_WIDTH }}
              animate={{ x: 0 }}
              exit={{ x: -DRAWER_WIDTH }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
                if (info.offset.x < -80 || info.velocity.x < -300) {
                  setIsMobileMenuOpen(false);
                }
              }}
              className="fixed top-0 left-0 bottom-0 z-50 bg-card border-r border-border/50 shadow-2xl overflow-y-auto touch-pan-y"
              style={{ width: DRAWER_WIDTH }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h2 className="text-base font-semibold text-foreground">Menu</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl hover:bg-muted/80">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Drag indicator */}
              <div className="flex justify-center py-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <nav className="px-3 pb-4 space-y-1">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                    >
                      <Link to={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={`w-full justify-start gap-3 h-12 rounded-xl transition-all duration-150 active:scale-[0.97] ${
                            isActive ? "bg-primary/10 text-primary font-semibold border border-primary/20" : ""
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                          {item.label}
                        </Button>
                      </Link>
                    </motion.div>
                  );
                })}

                <div className="pt-4">
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: menuItems.length * 0.03, duration: 0.2 }}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-150 active:scale-[0.97]"
                      onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                    >
                      <LogOut className="w-5 h-5" />
                      Sair
                    </Button>
                  </motion.div>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-16 min-h-screen overflow-hidden">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="p-4 md:p-6 w-full max-w-full overflow-hidden"
        >
          {isExpired && !ALLOWED_WHEN_EXPIRED.includes(location.pathname) ? (
            <SubscriptionBlocker isTrial={isTrial} />
          ) : (
            <Outlet />
          )}
        </motion.div>
      </main>

      {/* Footer com créditos */}
      <footer className="py-4 px-4 text-center border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          Sistema desenvolvido por <span className="font-semibold text-foreground/70">Jardiel De Sousa Lopes</span> — Criador da <span className="font-semibold text-primary">JTC</span>
        </p>
      </footer>

      {/* Botão flutuante Auri IA */}
      <AuriChat />
    </div>
  );
};

const DashboardLayout = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <PermissionsProvider userId={userId}>
      <DashboardLayoutInner />
    </PermissionsProvider>
  );
};

export default DashboardLayout;
