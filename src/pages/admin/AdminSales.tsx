import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { adminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const paymentLabels: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX", credito: "Crédito", debito: "Débito", fiado: "Fiado", misto: "Misto",
};

export default function AdminSales() {
  const [sales, setSales] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadSales(); }, [page]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const params: any = { page, per_page: 20 };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await adminApi("list_all_sales", params);
      setSales(data.sales || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi("delete_sale", { sale_id: deleteId });
      toast({ title: "Venda deletada" });
      setDeleteId(null);
      loadSales();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const handleFilter = () => { setPage(1); loadSales(); };
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Todas as Vendas</h1>
        <p className="text-muted-foreground">{total} vendas registradas</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        <Button onClick={handleFilter}>Filtrar</Button>
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
                    <th className="text-left p-3 font-medium">Vendedor</th>
                    <th className="text-left p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Pagamento</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Cliente</th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">Itens</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Data</th>
                    <th className="text-right p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{s.user_name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{s.user_email || ""}</p>
                      </td>
                      <td className="p-3 font-medium text-green-600">R$ {Number(s.total_amount).toFixed(2)}</td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{paymentLabels[s.payment_method] || s.payment_method}</Badge>
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{s.customer_name || "-"}</td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">{s.sale_items?.length || 0} itens</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}</td>
                      <td className="p-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(s.id)} title="Deletar"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma venda encontrada.</td></tr>}
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
          <AlertDialogHeader><AlertDialogTitle>Deletar venda?</AlertDialogTitle><AlertDialogDescription>A venda e todos os itens serão removidos permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
