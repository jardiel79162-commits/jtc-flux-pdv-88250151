import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
  CheckCircle,
  Lock,
  FileText,
  Edit,
  History,
  BarChart3,
  ShoppingCart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSION_GROUPS, PERMISSION_KEYS, type PermissionKey } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import PageLoader from "@/components/PageLoader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Employee {
  id: string;
  user_id: string;
  admin_id: string;
  is_active: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    cpf: string | null;
  };
  permissions: Record<string, boolean>;
}

interface EmployeeSale {
  id: string;
  created_at: string;
  total_amount: number;
  customer_name: string | null;
  payment_method: string;
}

interface EmployeePerformance {
  name: string;
  totalSales: number;
  salesCount: number;
}

const Employees = () => {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Employee | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [employeeSales, setEmployeeSales] = useState<EmployeeSale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [performanceData, setPerformanceData] = useState<EmployeePerformance[]>([]);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    cpf: "",
    password: "",
  });

  const [permState, setPermState] = useState<Record<string, boolean>>({});

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length > 9)
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    if (digits.length > 6)
      return digits.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    if (digits.length > 3)
      return digits.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    return digits;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      credit: "Crédito", debit: "Débito", pix: "PIX",
      cash: "Dinheiro", fiado: "Fiado", multiplo: "Múltiplo",
    };
    return methods[method] || method;
  };

  const loadEmployees = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: emps, error } = await supabase
      .from("employees" as any)
      .select("*")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading employees:", error);
      setLoading(false);
      return;
    }

    const enriched: Employee[] = [];

    for (const emp of (emps as any[]) || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, cpf")
        .eq("user_id", emp.user_id)
        .maybeSingle();

      const { data: perms } = await supabase
        .from("employee_permissions" as any)
        .select("permission_key, allowed")
        .eq("employee_id", emp.id);

      const permMap: Record<string, boolean> = {};
      (perms as any[] | null)?.forEach((p: any) => {
        permMap[p.permission_key] = p.allowed;
      });

      enriched.push({
        ...emp,
        profile: profile || undefined,
        permissions: permMap,
      });
    }

    setEmployees(enriched);
    setLoading(false);

    // Load performance data
    loadPerformanceData(enriched);
  }, []);

  const loadPerformanceData = async (emps: Employee[]) => {
    if (emps.length === 0) return;
    const perfData: EmployeePerformance[] = [];

    for (const emp of emps) {
      const { data: sales } = await supabase
        .from("sales" as any)
        .select("total_amount")
        .eq("employee_id", emp.id);

      const salesArr = (sales as any[] | null) || [];
      perfData.push({
        name: emp.profile?.full_name?.split(" ")[0] || "Sem nome",
        totalSales: salesArr.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0),
        salesCount: salesArr.length,
      });
    }

    setPerformanceData(perfData.sort((a, b) => b.totalSales - a.totalSales));
  };

  const loadEmployeeSales = async (emp: Employee) => {
    setLoadingSales(true);
    const { data: sales } = await supabase
      .from("sales" as any)
      .select("id, created_at, total_amount, customer_name, payment_method")
      .eq("employee_id", emp.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setEmployeeSales((sales as any[] | null) || []);
    setLoadingSales(false);
  };

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleCreate = async () => {
    if (!form.full_name || !form.cpf || !form.password || !form.email) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-employee", {
        body: {
          full_name: form.full_name,
          email: form.email,
          cpf: form.cpf,
          password: form.password,
          permissions: Object.values(PERMISSION_KEYS).map((key) => ({
            key, allowed: false,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Funcionário criado com sucesso!" });
      setForm({ full_name: "", email: "", cpf: "", password: "" });
      setShowForm(false);
      loadEmployees();
    } catch (err: any) {
      toast({
        title: "Erro ao criar funcionário",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (employee: Employee) => {
    try {
      const { error } = await supabase.functions.invoke("delete-employee", {
        body: { employee_id: employee.id },
      });
      if (error) throw error;
      toast({ title: "Funcionário removido com sucesso!" });
      setDeleteTarget(null);
      loadEmployees();
    } catch (err: any) {
      toast({
        title: "Erro ao remover funcionário",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const openPermissions = (emp: Employee) => {
    const initial: Record<string, boolean> = {};
    Object.values(PERMISSION_KEYS).forEach((key) => {
      initial[key] = emp.permissions[key] ?? false;
    });
    setPermState(initial);
    setShowPermissions(emp.id);
  };

  const savePermissions = async () => {
    if (!showPermissions) return;
    setSavingPerms(true);
    try {
      await supabase
        .from("employee_permissions" as any)
        .delete()
        .eq("employee_id", showPermissions);

      const rows = Object.entries(permState).map(([key, allowed]) => ({
        employee_id: showPermissions,
        permission_key: key,
        allowed,
      }));

      const { error } = await supabase
        .from("employee_permissions" as any)
        .insert(rows);

      if (error) throw error;
      toast({ title: "Permissões salvas com sucesso!" });
      setShowPermissions(null);
      loadEmployees();
    } catch (err: any) {
      toast({
        title: "Erro ao salvar permissões",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingPerms(false);
    }
  };

  const toggleStatus = async (emp: Employee) => {
    try {
      const { error } = await supabase
        .from("employees" as any)
        .update({ is_active: !emp.is_active })
        .eq("id", emp.id);
      if (error) throw error;
      toast({ title: emp.is_active ? "Funcionário desativado" : "Funcionário ativado" });
      loadEmployees();
    } catch {
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (!showPasswordChange || !newPassword || newPassword.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      // Use edge function to update password via admin API
      const { error, data } = await supabase.functions.invoke("create-employee", {
        body: {
          action: "change_password",
          user_id: showPasswordChange.user_id,
          password: newPassword,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Senha alterada com sucesso!" });
      setShowPasswordChange(null);
      setNewPassword("");
    } catch (err: any) {
      toast({
        title: "Erro ao alterar senha",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const openDetails = (emp: Employee) => {
    setShowDetails(emp);
    loadEmployeeSales(emp);
  };

  if (!isAdmin) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Somente o administrador principal pode gerenciar funcionários.
          </p>
        </div>
      </div>
    );
  }

  const currentPermEmployee = employees.find((e) => e.id === showPermissions);
  const activePermsCount = (emp: Employee) =>
    Object.values(emp.permissions).filter(Boolean).length;

  return (
    <PageLoader pageName="Funcionários">
      <div className="page-container w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="page-header-row">
          <div className="page-title-block">
            <div className="page-title-icon">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="page-title-text">Funcionários</h1>
              <p className="page-subtitle">
                Gerencie sua equipe e permissões de acesso
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2" size="sm">
            <UserPlus className="w-4 h-4" />
            Adicionar
          </Button>
        </div>

        {/* Performance Chart */}
        {performanceData.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Desempenho por Funcionário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "totalSales" ? formatCurrency(value) : value,
                      name === "totalSales" ? "Total Vendido" : "Qtd Vendas",
                    ]}
                  />
                  <Bar dataKey="totalSales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="totalSales" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {performanceData.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-xs bg-muted/50 rounded-lg p-2">
                    <span className="font-medium">{p.name}</span>
                    <div className="text-right">
                      <span className="text-primary font-semibold">{formatCurrency(p.totalSales)}</span>
                      <span className="text-muted-foreground ml-1">({p.salesCount} vendas)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : employees.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <Users className="w-16 h-16 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">Nenhum funcionário cadastrado</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Adicione funcionários para controlar o acesso ao sistema.
              </p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Adicionar Funcionário
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {employees.map((emp) => (
              <Card key={emp.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">
                          {emp.profile?.full_name || "Sem nome"}
                        </h3>
                        <Badge
                          variant={emp.is_active ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {emp.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.profile?.email || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activePermsCount(emp)} permissões ativas
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* View details */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDetails(emp)}
                        title="Visualizar detalhes"
                      >
                        <Eye className="w-4 h-4 text-primary" />
                      </Button>
                      {/* Permissions */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openPermissions(emp)}
                        title="Permissões"
                      >
                        <Shield className="w-4 h-4 text-primary" />
                      </Button>
                      {/* Change password */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setShowPasswordChange(emp); setNewPassword(""); }}
                        title="Alterar senha"
                      >
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      {/* Toggle status */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleStatus(emp)}
                        title={emp.is_active ? "Desativar" : "Ativar"}
                      >
                        {emp.is_active ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteTarget(emp)}
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Employee Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Adicionar Funcionário
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do novo funcionário. O login será feito com e-mail e senha.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Nome do funcionário"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: formatCpf(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={creating} className="gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? "Criando..." : "Criar Funcionário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail View Dialog */}
        <Dialog open={!!showDetails} onOpenChange={() => setShowDetails(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Detalhes do Funcionário
              </DialogTitle>
            </DialogHeader>

            {showDetails && (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info" className="text-xs">Informações</TabsTrigger>
                  <TabsTrigger value="perms" className="text-xs">Permissões</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome Completo</p>
                      <p className="text-sm font-medium">{showDetails.profile?.full_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{showDetails.profile?.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPF</p>
                      <p className="text-sm font-medium">{showDetails.profile?.cpf || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant={showDetails.is_active ? "default" : "secondary"}>
                        {showDetails.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Criado em</p>
                      <p className="text-sm font-medium">
                        {format(new Date(showDetails.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Permissões Ativas</p>
                      <p className="text-sm font-medium">{activePermsCount(showDetails)}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="perms" className="mt-4">
                  <div className="space-y-3">
                    {PERMISSION_GROUPS.map((group) => {
                      const activeInGroup = group.permissions.filter(
                        (p) => showDetails.permissions[p.key]
                      );
                      if (activeInGroup.length === 0) return null;
                      return (
                        <div key={group.label}>
                          <h4 className="text-xs font-semibold text-foreground mb-1">{group.label}</h4>
                          <div className="flex flex-wrap gap-1">
                            {activeInGroup.map((p) => (
                              <Badge key={p.key} variant="outline" className="text-[10px]">
                                {p.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {activePermsCount(showDetails) === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma permissão ativa
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  {loadingSales ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : employeeSales.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma venda registrada por este funcionário
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {employeeSales.map((sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <ShoppingCart className="w-3 h-3 text-primary" />
                              <span className="text-xs font-medium">
                                {formatCurrency(sale.total_amount)}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {sale.customer_name || "Cliente Avulso"} • {getPaymentMethodLabel(sale.payment_method)}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(sale.created_at), "dd/MM/yy HH:mm")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={!!showPasswordChange} onOpenChange={() => setShowPasswordChange(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Alterar Senha
              </DialogTitle>
              <DialogDescription>
                Nova senha para {showPasswordChange?.profile?.full_name || "funcionário"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nova Senha *</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordChange(null)} disabled={changingPassword}>
                Cancelar
              </Button>
              <Button onClick={handleChangePassword} disabled={changingPassword} className="gap-2">
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {changingPassword ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={!!showPermissions} onOpenChange={() => setShowPermissions(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Permissões do Funcionário
              </DialogTitle>
              <DialogDescription>
                {currentPermEmployee?.profile?.full_name || "Funcionário"} — ative ou desative o acesso a cada área do sistema.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label} className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                    {group.label}
                  </h4>
                  <div className="space-y-2">
                    {group.permissions.map((perm) => (
                      <div key={perm.key} className="flex items-center justify-between gap-3 py-1">
                        <span className="text-sm text-muted-foreground">{perm.label}</span>
                        <Switch
                          checked={permState[perm.key] ?? false}
                          onCheckedChange={(checked) =>
                            setPermState((prev) => ({ ...prev, [perm.key]: checked }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPermissions(null)} disabled={savingPerms}>
                Cancelar
              </Button>
              <Button onClick={savePermissions} disabled={savingPerms} className="gap-2">
                {savingPerms ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {savingPerms ? "Salvando..." : "Salvar Permissões"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Funcionário?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover{" "}
                <strong>{deleteTarget?.profile?.full_name}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLoader>
  );
};

export default Employees;
