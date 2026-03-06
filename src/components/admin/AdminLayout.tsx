import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CreditCard, FileText, Shield, LogOut, Menu, X,
  Loader2, Building2, UserCog, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/hooks/useAdminApi";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/admin/empresas", label: "Empresas", icon: Building2, end: false },
  { path: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard, end: false },
  { path: "/admin/assinaturas", label: "Assinaturas", icon: UserCog, end: false },
  { path: "/admin/logs", label: "Logs", icon: FileText, end: false },
  { path: "/admin/manutencao", label: "Manutenção", icon: Shield, end: false },
  { path: "/admin/mensagens", label: "Mensagens", icon: MessageCircle, end: false },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authState, setAuthState] = useState<"loading" | "admin" | "setup" | "denied">("loading");
  const [claiming, setClaiming] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const result = await adminApi("check_or_setup_admin");
      if (result.is_admin) setAuthState("admin");
      else if (result.can_setup) setAuthState("setup");
      else setAuthState("denied");
    } catch {
      setAuthState("denied");
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await adminApi("claim_admin");
      setAuthState("admin");
    } catch {
      setAuthState("denied");
    } finally {
      setClaiming(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">Você não tem permissão para acessar o painel administrativo.</p>
          <Button onClick={() => navigate("/auth")}>Voltar ao Login</Button>
        </div>
      </div>
    );
  }

  if (authState === "setup") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Configurar Administrador</h1>
          <p className="text-muted-foreground mb-6">
            Nenhum administrador foi configurado ainda. Deseja se tornar o administrador do sistema?
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/auth")}>Cancelar</Button>
            <Button onClick={handleClaim} disabled={claiming}>
              {claiming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Tornar-me Administrador
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h1 className="text-lg font-bold text-white">JTC FLUX</h1>
            <p className="text-xs text-slate-400">Painel Administrativo</p>
          </div>
          <button className="lg:hidden text-slate-300 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 130px)" }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 bg-background border-b p-4 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <span className="font-semibold">Admin</span>
        </header>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
