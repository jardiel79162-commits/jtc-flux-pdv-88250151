import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/hooks/useAdminApi";
import { format } from "date-fns";

const eventTypes = [
  { value: "", label: "Todos" },
  { value: "user_login", label: "Login" },
  { value: "user_blocked", label: "Bloqueio" },
  { value: "user_unblocked", label: "Desbloqueio" },
  { value: "user_deleted", label: "Exclusão" },
  { value: "user_updated", label: "Atualização" },
  { value: "maintenance_updated", label: "Manutenção" },
  { value: "admin_setup", label: "Setup Admin" },
];

const eventColors: Record<string, string> = {
  user_blocked: "destructive",
  user_deleted: "destructive",
  user_unblocked: "default",
  user_updated: "secondary",
  maintenance_updated: "outline",
  admin_setup: "default",
  user_login: "secondary",
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState("");

  useEffect(() => { loadLogs(); }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, per_page: 50 };
      if (eventType) params.event_type = eventType;
      const data = await adminApi("get_logs", params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => { setPage(1); loadLogs(); };
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logs do Sistema</h1>
        <p className="text-muted-foreground">{total} registros</p>
      </div>

      <div className="flex gap-3">
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((et) => (
              <SelectItem key={et.value || "all"} value={et.value || "all"}>{et.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleFilter}>Filtrar</Button>
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
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Descrição</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Badge variant={(eventColors[log.event_type] as any) || "secondary"}>
                          {eventTypes.find((e) => e.value === log.event_type)?.label || log.event_type}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <p className="text-sm">{log.description || "-"}</p>
                        {log.metadata && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(log.metadata).substring(0, 100)}
                          </p>
                        )}
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-10 text-muted-foreground">Nenhum log encontrado.</td></tr>
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
    </div>
  );
}
