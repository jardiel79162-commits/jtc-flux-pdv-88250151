import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Loader2, ShieldOff, ShieldCheck, Trash2, Edit, KeyRound, ChevronRight,
  Store, Package, ShoppingCart, Users as UsersIcon, Truck, Calendar, CreditCard, UserPlus, Eye, EyeOff, X, CalendarPlus
} from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  cpf: string | null;
  phone: string | null;
  is_blocked: boolean;
  created_at: string;
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
  invite_code: string | null;
  referred_by_code: string | null;
  roles: string[];
  is_system_admin: boolean;
  store_name: string | null;
  store_logo: string | null;
  store_category: string | null;
  friends_invited: number;
}

export default function AdminEmpresas() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Detail panel
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit dialog
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState({ full_name: "", email: "", cpf: "", phone: "" });

  // Password dialog
  const [passwordDialog, setPasswordDialog] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);

  // Extend subscription dialog
  const [extendUser, setExtendUser] = useState<UserProfile | null>(null);
  const [extendDays, setExtendDays] = useState("30");

  const { toast } = useToast();

  useEffect(() => { loadUsers(); }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi("list_users", { search: search || undefined, page, per_page: 20 });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally { setLoading(false); }
  };

  const loadDetail = async (user: UserProfile) => {
    setSelectedUser(user);
    setDetailLoading(true);
    try {
      const data = await adminApi("get_user_detail", { user_id: user.user_id });
      setDetail(data);
    } catch (err) { console.error(err); }
    finally { setDetailLoading(false); }
  };

  const handleSearch = () => { setPage(1); loadUsers(); };

  const handleAction = async (action: string, userId: string, params?: any) => {
    setActionLoading(userId);
    try {
      await adminApi(action, { user_id: userId, ...params });
      toast({ title: "Ação realizada com sucesso" });
      loadUsers();
      if (selectedUser?.user_id === userId) loadDetail(selectedUser);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    await handleAction("delete_user", deleteUser.user_id);
    setDeleteUser(null);
    if (selectedUser?.user_id === deleteUser.user_id) { setSelectedUser(null); setDetail(null); }
  };

  const openEdit = (user: UserProfile) => {
    setEditUser(user);
    setEditData({ full_name: user.full_name || "", email: user.email || "", cpf: user.cpf || "", phone: user.phone || "" });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    await handleAction("update_user", editUser.user_id, { data: editData });
    setEditUser(null);
  };

  const handleResetPassword = async () => {
    if (!passwordDialog || !newPassword) return;
    await handleAction("reset_user_password", passwordDialog.user_id, { new_password: newPassword });
    setPasswordDialog(null);
    setNewPassword("");
  };

  const handleExtend = async () => {
    if (!extendUser) return;
    await handleAction("extend_subscription", extendUser.user_id, { days: parseInt(extendDays) });
    setExtendUser(null);
  };


  const getSubStatus = (user: any) => {
    const now = new Date();
    if (user.subscription_ends_at && new Date(user.subscription_ends_at) > now) return { label: "Ativo", variant: "default" as const, color: "text-green-600" };
    if (user.trial_ends_at && new Date(user.trial_ends_at) > now) return { label: "Trial", variant: "secondary" as const, color: "text-yellow-600" };
    if (user.subscription_ends_at) return { label: "Expirado", variant: "destructive" as const, color: "text-red-600" };
    return { label: "Sem plano", variant: "outline" as const, color: "text-muted-foreground" };
  };

  const totalPages = Math.ceil(total / 20);
  const paymentLabels: Record<string, string> = { dinheiro: "Dinheiro", pix: "PIX", credito: "Crédito", debito: "Débito", fiado: "Fiado", misto: "Misto" };
  const paymentStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendente", variant: "secondary" }, approved: { label: "Aprovado", variant: "default" },
    rejected: { label: "Rejeitado", variant: "destructive" }, cancelled: { label: "Cancelado", variant: "outline" },
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Empresas</h1>
        <p className="text-muted-foreground">{total} empresas cadastradas</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, loja, e-mail ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="pl-10" />
        </div>
        <Button onClick={handleSearch}>Buscar</Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* List */}
        <div className={`${selectedUser ? "lg:w-1/3" : "w-full"} space-y-2 transition-all`}>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {users.filter(u => !u.is_system_admin).map((user) => {
                const sub = getSubStatus(user);
                const isSelected = selectedUser?.user_id === user.user_id;
                return (
                  <Card
                    key={user.user_id}
                    className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => loadDetail(user)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      {user.store_logo ? (
                        <img src={user.store_logo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{user.store_name || user.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.full_name} • {user.store_category || "Sem categoria"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {user.is_blocked && <Badge variant="destructive" className="text-[10px] px-1.5">Suspenso</Badge>}
                        <Badge variant={sub.variant} className="text-[10px] px-1.5">{sub.label}</Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {users.length === 0 && <p className="text-center py-10 text-muted-foreground">Nenhuma empresa encontrada.</p>}

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                  <span className="text-xs text-muted-foreground self-center">{page}/{totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Panel */}
        {selectedUser && (
          <div className="lg:w-2/3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedUser.store_logo ? (
                      <img src={selectedUser.store_logo} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center"><Store className="w-6 h-6 text-muted-foreground" /></div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{selectedUser.store_name || selectedUser.full_name || "Sem nome"}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedUser.store_category || "Sem categoria"}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(null); setDetail(null); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(selectedUser)}><Edit className="w-3 h-3 mr-1" />Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => { setPasswordDialog(selectedUser); setNewPassword(""); }}><KeyRound className="w-3 h-3 mr-1" />Senha</Button>
                  {selectedUser.is_blocked ? (
                    <Button size="sm" variant="outline" className="text-green-600 border-green-600/30" onClick={() => handleAction("unblock_user", selectedUser.user_id)} disabled={actionLoading === selectedUser.user_id}>
                      <ShieldCheck className="w-3 h-3 mr-1" />Reativar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-orange-600 border-orange-600/30" onClick={() => handleAction("block_user", selectedUser.user_id)} disabled={actionLoading === selectedUser.user_id || selectedUser.is_system_admin}>
                      <ShieldOff className="w-3 h-3 mr-1" />Suspender
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setExtendUser(selectedUser); setExtendDays("30"); }}>
                    <CalendarPlus className="w-3 h-3 mr-1" />Estender
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteUser(selectedUser)} disabled={selectedUser.is_system_admin}>
                    <Trash2 className="w-3 h-3 mr-1" />Deletar
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {detailLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : detail ? (
                  <Tabs defaultValue="info" className="w-full">
                    <TabsList className="w-full flex overflow-x-auto">
                      <TabsTrigger value="info" className="flex-1 text-xs">Info</TabsTrigger>
                      <TabsTrigger value="subscription" className="flex-1 text-xs">Assinatura</TabsTrigger>
                      <TabsTrigger value="sales" className="flex-1 text-xs">Vendas</TabsTrigger>
                      <TabsTrigger value="payments" className="flex-1 text-xs">Pagamentos</TabsTrigger>
                      <TabsTrigger value="referrals" className="flex-1 text-xs">Convites</TabsTrigger>
                    </TabsList>

                    {/* INFO TAB */}
                    <TabsContent value="info" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground block text-xs">Nome</span><span className="font-medium">{detail.profile?.full_name || "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">E-mail</span><span className="font-medium break-all">{detail.profile?.email || "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">CPF</span><span className="font-medium">{detail.profile?.cpf || "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">Telefone</span><span className="font-medium">{detail.profile?.phone || "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">Cidade/UF</span><span className="font-medium">{detail.profile?.city || "-"}/{detail.profile?.state || "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">CEP</span><span className="font-medium">{detail.profile?.cep || "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">Cadastro</span><span className="font-medium">{detail.profile?.created_at ? format(new Date(detail.profile.created_at), "dd/MM/yyyy HH:mm") : "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">Código Convite</span><span className="font-medium">{detail.profile?.invite_code || "-"}</span></div>
                      </div>

                      {detail.storeSettings && (
                        <div className="pt-3 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">DADOS DA LOJA</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-muted-foreground block text-xs">Nome da Loja</span><span className="font-medium">{detail.storeSettings.store_name || "-"}</span></div>
                            <div><span className="text-muted-foreground block text-xs">Categoria</span><span className="font-medium">{detail.storeSettings.category || "-"}</span></div>
                            <div><span className="text-muted-foreground block text-xs">Tel. Comercial</span><span className="font-medium">{detail.storeSettings.commercial_phone || "-"}</span></div>
                            <div><span className="text-muted-foreground block text-xs">Endereço</span><span className="font-medium">{detail.storeSettings.store_address || "-"}</span></div>
                            <div><span className="text-muted-foreground block text-xs">PIX</span><span className="font-medium">{detail.storeSettings.pix_key || "-"}</span></div>
                            <div><span className="text-muted-foreground block text-xs">Tipo PIX</span><span className="font-medium">{detail.storeSettings.pix_key_type || "-"}</span></div>
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">RESUMO</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-muted rounded-lg p-3 text-center">
                            <Package className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-lg font-bold">{detail.totalProducts}</p>
                            <p className="text-[10px] text-muted-foreground">Produtos</p>
                          </div>
                          <div className="bg-muted rounded-lg p-3 text-center">
                            <ShoppingCart className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-lg font-bold">{detail.totalSales}</p>
                            <p className="text-[10px] text-muted-foreground">Vendas</p>
                          </div>
                          <div className="bg-muted rounded-lg p-3 text-center">
                            <UsersIcon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-lg font-bold">{detail.totalCustomers}</p>
                            <p className="text-[10px] text-muted-foreground">Clientes</p>
                          </div>
                          <div className="bg-muted rounded-lg p-3 text-center">
                            <Truck className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-lg font-bold">{detail.totalSuppliers}</p>
                            <p className="text-[10px] text-muted-foreground">Fornecedores</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* SUBSCRIPTION TAB */}
                    <TabsContent value="subscription" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground block text-xs">Status</span>
                          <Badge variant={getSubStatus(detail.profile).variant} className="mt-1">{getSubStatus(detail.profile).label}</Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Expira em</span>
                          <span className="font-medium">{detail.profile?.subscription_ends_at ? format(new Date(detail.profile.subscription_ends_at), "dd/MM/yyyy HH:mm") : "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Trial até</span>
                          <span className="font-medium">{detail.profile?.trial_ends_at ? format(new Date(detail.profile.trial_ends_at), "dd/MM/yyyy HH:mm") : "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Receita Total</span>
                          <span className="font-medium text-green-600">R$ {detail.totalSalesRevenue?.toFixed(2) || "0.00"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => { setExtendUser(selectedUser); setExtendDays("30"); }}><CalendarPlus className="w-3 h-3 mr-1" />Estender</Button>
                      </div>
                    </TabsContent>

                    {/* SALES TAB */}
                    <TabsContent value="sales" className="mt-4">
                      <p className="text-sm text-muted-foreground mb-3">{detail.totalSales} vendas • R$ {detail.totalSalesRevenue?.toFixed(2) || "0.00"} total</p>
                      {detail.recentSales?.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {detail.recentSales.map((sale: any) => (
                            <div key={sale.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                              <div>
                                <p className="font-medium">R$ {Number(sale.total_amount).toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">{paymentLabels[sale.payment_method] || sale.payment_method} {sale.customer_name ? `• ${sale.customer_name}` : ""}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">{format(new Date(sale.created_at), "dd/MM HH:mm")}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>}
                    </TabsContent>

                    {/* PAYMENTS TAB */}
                    <TabsContent value="payments" className="mt-4">
                      {detail.subscriptionPayments?.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {detail.subscriptionPayments.map((p: any) => {
                            const st = paymentStatusLabels[p.status] || { label: p.status, variant: "secondary" as const };
                            return (
                              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                                <div>
                                  <p className="font-medium">R$ {Number(p.amount).toFixed(2)} - {p.plan_type}</p>
                                  <p className="text-xs text-muted-foreground">+{p.days_to_add} dias</p>
                                </div>
                                <div className="text-right">
                                  <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(p.created_at), "dd/MM/yyyy")}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">Nenhum pagamento de assinatura.</p>}
                    </TabsContent>

                    {/* REFERRALS TAB */}
                    <TabsContent value="referrals" className="mt-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="bg-muted rounded-lg p-3 text-center">
                          <UserPlus className="w-5 h-5 mx-auto mb-1 text-primary" />
                          <p className="text-2xl font-bold">{detail.friendsInvited}</p>
                          <p className="text-xs text-muted-foreground">Amigos convidados</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-center">
                          <p className="text-sm font-medium">Código</p>
                          <p className="text-lg font-bold text-primary">{detail.profile?.invite_code || "-"}</p>
                        </div>
                        {detail.profile?.referred_by_code && (
                          <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-sm font-medium">Convidado por</p>
                            <p className="text-lg font-bold">{detail.profile.referred_by_code}</p>
                          </div>
                        )}
                      </div>

                      {detail.inviteCodes?.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {detail.inviteCodes.map((code: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                              <span className="font-mono font-medium">{code.code}</span>
                              <Badge variant={code.is_used ? "default" : "outline"} className="text-[10px]">
                                {code.is_used ? "Usado" : "Disponível"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">Nenhum código de convite.</p>}
                    </TabsContent>
                  </Tabs>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Empresa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} /></div>
            <div><Label>CPF</Label><Input value={editData.cpf} onChange={(e) => setEditData({ ...editData, cpf: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={!!passwordDialog} onOpenChange={(open) => !open && setPasswordDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redefinir Senha</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{passwordDialog?.full_name} ({passwordDialog?.email})</p>
            <div className="relative">
              <Label>Nova Senha</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog(null)}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={newPassword.length < 6}>Redefinir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Dialog */}
      <Dialog open={!!extendUser} onOpenChange={(open) => !open && setExtendUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Estender Assinatura - {extendUser?.store_name || extendUser?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Dias para adicionar</Label><Input type="number" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} min="1" /></div>
            <div className="flex gap-2 flex-wrap">
              {[7, 15, 30, 90, 365].map((d) => (
                <Button key={d} size="sm" variant={extendDays === String(d) ? "default" : "outline"} onClick={() => setExtendDays(String(d))}>{d}d</Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendUser(null)}>Cancelar</Button>
            <Button onClick={handleExtend}>Estender</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteUser?.store_name || deleteUser?.full_name}</strong> ({deleteUser?.email}) será removido permanentemente com todos os dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
