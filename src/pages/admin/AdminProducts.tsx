import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { adminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadProducts(); }, [page]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await adminApi("list_all_products", { search: search || undefined, page, per_page: 20 });
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi("delete_product", { product_id: deleteId });
      toast({ title: "Produto deletado" });
      setDeleteId(null);
      loadProducts();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const handleSearch = () => { setPage(1); loadProducts(); };
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Todos os Produtos</h1>
        <p className="text-muted-foreground">{total} produtos no sistema</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produto ou código de barras..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="pl-10" />
        </div>
        <Button onClick={handleSearch}>Buscar</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Produto</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Dono</th>
                    <th className="text-left p-3 font-medium">Preço</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Estoque</th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">Status</th>
                    <th className="text-right p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.barcode || p.internal_code || "-"}</p>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <p className="text-sm">{p.profiles?.full_name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{p.profiles?.email || ""}</p>
                      </td>
                      <td className="p-3 font-medium">R$ {Number(p.price).toFixed(2)}</td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge variant={p.stock_quantity <= (p.min_stock_quantity || 0) ? "destructive" : "outline"} className="text-xs">
                          {p.stock_quantity}
                        </Badge>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">{p.is_active ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)} title="Deletar"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum produto encontrado.</td></tr>}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Deletar produto?</AlertDialogTitle><AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
