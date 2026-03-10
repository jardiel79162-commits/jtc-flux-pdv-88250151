import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Search, Loader2, MapPin, Phone, Clock, CheckCircle2, Truck, ChefHat, ClipboardList } from "lucide-react";
import { useEffect } from "react";

interface OrderData {
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  store_name: string | null;
  items: { product_name: string; quantity: number; unit_price: number }[];
}

const STATUS_STEPS = [
  { key: "received", label: "Pedido Recebido", icon: ClipboardList, color: "text-blue-500" },
  { key: "preparing", label: "Em Preparo", icon: ChefHat, color: "text-yellow-500" },
  { key: "delivering", label: "Saiu para Entrega", icon: Truck, color: "text-orange-500" },
  { key: "delivered", label: "Entregue", icon: CheckCircle2, color: "text-green-500" },
];

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_entrega: "Cartão na Entrega",
  mercado_pago: "Mercado Pago",
};

const OrderTracking = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const initialOrderNumber = searchParams.get("pedido") || "";

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialOrderNumber) {
      handleSearch(initialOrderNumber);
    }
  }, []);

  const handleSearch = async (num?: string) => {
    const searchNum = num || orderNumber;
    if (!searchNum.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("public-catalog", {
        body: { action: "track_order", order_number: parseInt(searchNum), store_slug: slug },
      });

      if (fnError || data?.error) {
        setError(data?.error || "Erro ao buscar pedido");
        setOrder(null);
      } else {
        setOrder(data);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = order ? STATUS_STEPS.findIndex((s) => s.key === order.status) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acompanhar Pedido</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {slug ? `Loja: ${slug}` : "Digite o número do seu pedido"}
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Número do pedido"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="h-12 text-lg font-semibold text-center rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button
            onClick={() => handleSearch()}
            disabled={loading || !orderNumber.trim()}
            className="h-12 px-6 rounded-xl"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </Button>
        </div>

        {error && searched && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-center text-destructive text-sm font-medium">
              {error}
            </CardContent>
          </Card>
        )}

        {order && (
          <div className="space-y-4 animate-in fade-in-50">
            {/* Store & Order Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Pedido</p>
                    <p className="text-2xl font-bold text-primary">#{order.order_number}</p>
                  </div>
                  {order.store_name && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Loja</p>
                      <p className="font-semibold text-sm">{order.store_name}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(order.created_at).toLocaleString("pt-BR")}
                </div>
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-4">Status do Pedido</p>
                <div className="space-y-0">
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const StepIcon = step.icon;

                    return (
                      <div key={step.key} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              isCurrent
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20"
                                : isCompleted
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <StepIcon className="w-5 h-5" />
                          </div>
                          {index < STATUS_STEPS.length - 1 && (
                            <div
                              className={`w-0.5 h-8 ${
                                index < currentStepIndex ? "bg-primary/40" : "bg-muted"
                              }`}
                            />
                          )}
                        </div>
                        <div className={`pt-2 ${isCurrent ? "" : "opacity-60"}`}>
                          <p className={`text-sm font-semibold ${isCurrent ? "text-primary" : ""}`}>
                            {step.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {order.status === "cancelled" && (
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm font-semibold text-destructive text-center">
                      Pedido Cancelado
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-3">Itens do Pedido</p>
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span>
                        {item.quantity}x {item.product_name}
                      </span>
                      <span className="font-semibold">
                        R$ {(item.quantity * item.unit_price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">R$ {order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Info */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold text-sm mb-2">Dados da Entrega</p>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{order.customer_phone}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{order.customer_address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Pagamento:</span>
                  <span className="font-medium">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span>
                </div>
                {order.notes && (
                  <div className="text-sm bg-muted/30 rounded-lg p-2 mt-2">
                    <span className="text-muted-foreground">Obs: </span>{order.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {!order && searched && !loading && !error && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Pedido não encontrado</p>
              <p className="text-xs mt-1">Verifique o número e tente novamente</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
