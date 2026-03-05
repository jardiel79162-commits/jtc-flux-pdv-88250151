import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Store } from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";
import { format } from "date-fns";

export default function AdminStores() {
  const [stores, setStores] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStores(); }, [page]);

  const loadStores = async () => {
    setLoading(true);
    try {
      const data = await adminApi("list_all_stores", { page, per_page: 20 });
      setStores(data.stores || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lojas Cadastradas</h1>
        <p className="text-muted-foreground">{total} lojas no sistema</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : stores.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma loja cadastrada.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store: any) => (
            <Card key={store.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Store className="w-5 h-5 text-muted-foreground" /></div>
                  )}
                  <div>
                    <p className="font-semibold">{store.store_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{store.category || "Sem categoria"}</p>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Dono:</span> {store.owner_name}</p>
                  <p><span className="text-muted-foreground">Email:</span> {store.owner_email}</p>
                  {store.commercial_phone && <p><span className="text-muted-foreground">Tel:</span> {store.commercial_phone}</p>}
                  {store.store_address && <p><span className="text-muted-foreground">End:</span> {store.store_address}</p>}
                  {store.pix_key && <p><span className="text-muted-foreground">PIX:</span> {store.pix_key}</p>}
                </div>
                <p className="text-xs text-muted-foreground">Criado: {format(new Date(store.created_at), "dd/MM/yyyy")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground self-center">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}
