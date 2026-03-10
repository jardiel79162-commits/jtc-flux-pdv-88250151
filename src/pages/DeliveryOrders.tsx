import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ClipboardList, Loader2, Phone, MapPin, Package, Clock, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import PageLoader from "@/components/PageLoader";
import AnimatedPage from "@/components/AnimatedPage";

interface DeliveryOrder {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  received: { label: "Pedido Recebido", color: "bg-blue-500" },
  preparing: { label: "Em Preparo", color: "bg-yellow-500" },
  delivering: { label: "Saiu para Entrega", color: "bg-orange-500" },
  delivered: { label: "Entregue", color: "bg-green-500" },
  cancelled: { label: "Cancelado", color: "bg-red-500" },
};

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_entrega: "Cartão na Entrega",
  mercado_pago: "Mercado Pago",
};

// Simple notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // Play a pleasant 3-note chime
    playTone(880, 0, 0.15);
    playTone(1100, 0.15, 0.15);
    playTone(1320, 0.3, 0.3);
  } catch {
    // Audio not available
  }
}

export default function DeliveryOrders() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  const { getEffectiveUserId } = usePermissions();
  const knownOrderIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const loadOrders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const effectiveId = getEffectiveUserId() || session.user.id;

    let query = supabase
      .from("delivery_orders" as any)
      .select("*")
      .eq("store_user_id", effectiveId)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
    } else {
      const newOrders = (data as any[]) || [];
      
      // Track known IDs on initial load
      if (!initialLoadDone.current) {
        newOrders.forEach((o) => knownOrderIds.current.add(o.id));
        initialLoadDone.current = true;
      }
      
      setOrders(newOrders);
    }
    setLoading(false);
  }, [getEffectiveUserId, statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Realtime with sound notification
  useEffect(() => {
    let channel: any;
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const effectiveId = getEffectiveUserId() || session.user.id;
      channel = supabase
        .channel("delivery-orders-rt")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "delivery_orders",
          filter: `store_user_id=eq.${effectiveId}`,
        }, (payload: any) => {
          const newOrder = payload.new;
          if (newOrder && !knownOrderIds.current.has(newOrder.id)) {
            knownOrderIds.current.add(newOrder.id);
            
            // Play sound
            if (soundEnabled) {
              playNotificationSound();
            }
            
            // Show toast
            toast({
              title: `🔔 Novo Pedido #${newOrder.order_number}`,
              description: `${newOrder.customer_name} — ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(newOrder.total_amount)}`,
            });
          }
          loadOrders();
        })
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "delivery_orders",
          filter: `store_user_id=eq.${effectiveId}`,
        }, () => { loadOrders(); })
        .subscribe();
    };
    setupRealtime();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [loadOrders, getEffectiveUserId, soundEnabled, toast]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("delivery_orders" as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
      .eq("id", orderId);
    if (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } else {
      toast({ title: `Status atualizado para: ${STATUS_MAP[newStatus]?.label}` });
      loadOrders();
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) {
    return (
      <PageLoader pageName="Pedidos">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </PageLoader>
    );
  }

  return (
    <PageLoader pageName="Pedidos">
      <AnimatedPage>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <ClipboardList className="w-8 h-8" /> Pedidos
              </h1>
              <p className="text-muted-foreground">Gerencie os pedidos do delivery</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {soundEnabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                <Label className="text-xs text-muted-foreground">Som</Label>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="received">Recebidos</SelectItem>
                  <SelectItem value="preparing">Em Preparo</SelectItem>
                  <SelectItem value="delivering">Em Entrega</SelectItem>
                  <SelectItem value="delivered">Entregues</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => {
                const status = STATUS_MAP[order.status] || STATUS_MAP.received;
                const nextStatuses: Record<string, string[]> = {
                  received: ["preparing", "cancelled"],
                  preparing: ["delivering", "cancelled"],
                  delivering: ["delivered"],
                };
                const availableNext = nextStatuses[order.status] || [];

                return (
                  <Card key={order.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-base">
                          Pedido #{order.order_number}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={`${status.color} text-white border-0`}>{status.label}</Badge>
                          <span className="text-sm font-bold text-primary">{formatCurrency(order.total_amount)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-muted-foreground">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline">{order.customer_phone}</a>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <p className="text-muted-foreground">{order.customer_address}</p>
                        </div>
                      </div>
                      {order.notes && (
                        <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2">📝 {order.notes}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(order.created_at).toLocaleString("pt-BR")}
                        </div>
                        <div className="flex gap-2">
                          {availableNext.map((s) => (
                            <Button key={s} size="sm" variant={s === "cancelled" ? "destructive" : "default"} onClick={() => updateStatus(order.id, s)}>
                              {STATUS_MAP[s]?.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </AnimatedPage>
    </PageLoader>
  );
}
