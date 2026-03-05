import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Ban, CheckCircle, Trash2, Edit, Shield } from "lucide-react";
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
  roles: string[];
  is_system_admin: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState({ full_name: "", email: "", cpf: "", phone: "" });
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { setPage(1); loadUsers(); };

  const handleBlock = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi("block_user", { user_id: userId });
      toast({ title: "Usuário bloqueado" });
      loadUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi("unblock_user", { user_id: userId });
      toast({ title: "Usuário desbloqueado" });
      loadUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setActionLoading(deleteUser.user_id);
    try {
      await adminApi("delete_user", { user_id: deleteUser.user_id });
      toast({ title: "Usuário deletado" });
      setDeleteUser(null);
      loadUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const openEdit = (user: UserProfile) => {
    setEditUser(user);
    setEditData({
      full_name: user.full_name || "",
      email: user.email || "",
      cpf: user.cpf || "",
      phone: user.phone || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setActionLoading(editUser.user_id);
    try {
      await adminApi("update_user", { user_id: editUser.user_id, data: editData });
      toast({ title: "Dados atualizados" });
      setEditUser(null);
      loadUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Controle de Usuários</h1>
        <p className="text-muted-foreground">{total} usuários cadastrados</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Buscar</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">E-mail</th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">CPF</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Cargo</th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">Criado em</th>
                    <th className="text-right p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.user_id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{user.full_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{user.email}</td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">{user.cpf || "-"}</td>
                      <td className="p-3">
                        {user.is_blocked ? (
                          <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-600">Ativo</Badge>
                        )}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {user.is_system_admin && <Badge className="text-xs bg-purple-600">Admin Sistema</Badge>}
                          {user.roles.map((r) => (
                            <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">
                        {format(new Date(user.created_at), "dd/MM/yyyy")}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(user)} title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {user.is_blocked ? (
                            <Button
                              size="icon" variant="ghost"
                              onClick={() => handleUnblock(user.user_id)}
                              disabled={actionLoading === user.user_id}
                              title="Desbloquear"
                            >
                              {actionLoading === user.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                            </Button>
                          ) : (
                            <Button
                              size="icon" variant="ghost"
                              onClick={() => handleBlock(user.user_id)}
                              disabled={actionLoading === user.user_id || user.is_system_admin}
                              title="Bloquear"
                            >
                              {actionLoading === user.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4 text-red-500" />}
                            </Button>
                          )}
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => setDeleteUser(user)}
                            disabled={user.is_system_admin}
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum usuário encontrado.</td></tr>
                  )}
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

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={editData.cpf} onChange={(e) => setEditData({ ...editData, cpf: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={actionLoading === editUser?.user_id}>
              {actionLoading === editUser?.user_id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O usuário <strong>{deleteUser?.full_name}</strong> ({deleteUser?.email}) será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
