import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Database } from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";

export default function AdminDatabase() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await adminApi("get_db_overview");
      setTables(data.tables || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalRecords = tables.reduce((sum, t) => sum + t.count, 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Visão do Banco de Dados</h1>
        <p className="text-muted-foreground">{totalRecords} registros em {tables.length} tabelas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tables.map((t: any) => (
          <Card key={t.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                {t.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{t.count.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">registros</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
