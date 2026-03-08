import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, Phone, MapPin, Share2, Search, X, ShoppingCart, Plus, Minus, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface Product {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  description: string | null;
  photos: string[] | null;
  stock_quantity: number;
  product_type: string | null;
  is_active: boolean | null;
}

interface StoreInfo {
  store_name: string | null;
  logo_url: string | null;
  commercial_phone: string | null;
  store_address: string | null;
  primary_color: string | null;
  category: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function getProductPrice(product: Product) {
  return product.promotional_price && product.promotional_price < product.price
    ? product.promotional_price
    : product.price;
}

export default function PublicCatalog() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    if (slug) loadCatalog();
  }, [slug]);

  const loadCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try slug first; if it looks like a UUID, use store_id for backward compat
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || "");
      const body = isUUID ? { store_id: slug } : { store_slug: slug };
      const { data, error: fnError } = await supabase.functions.invoke("public-catalog", {
        body,
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setStore(data.store);
      setProducts(data.products || []);
    } catch (err: any) {
      console.error(err);
      setError("Catálogo não encontrado ou indisponível.");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, i) => sum + getProductPrice(i.product) * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleWhatsAppCheckout = () => {
    if (!store?.commercial_phone || cart.length === 0) return;

    const phone = store.commercial_phone.replace(/\D/g, "");
    const lines = cart.map(
      (i) =>
        `• ${i.quantity}x ${i.product.name} — ${formatCurrency(getProductPrice(i.product) * i.quantity)}`
    );
    const message = `Olá! Gostaria de fazer o seguinte pedido:\n\n${lines.join("\n")}\n\n*Total: ${formatCurrency(cartTotal)}*`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleShare = () => {
    const url = window.location.href;
    const text = `Confira o catálogo de ${store?.store_name || "produtos"}! ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    alert("Link copiado!");
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const accentColor = store?.primary_color || "#4C6FFF";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-200" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-700 mb-2">Catálogo não encontrado</h1>
          <p className="text-gray-500">{error || "Este catálogo não está disponível."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.store_name || ""} className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: accentColor }} />
            ) : (
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: accentColor }}>
                {(store.store_name || "L")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{store.store_name || "Loja"}</h1>
              {store.category && <p className="text-xs text-gray-500">{store.category}</p>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={handleCopyLink} className="text-xs gap-1">
                Copiar Link
              </Button>
              <Button size="sm" onClick={handleShare} className="text-xs gap-1" style={{ backgroundColor: accentColor }}>
                <Share2 className="w-3 h-3" /> WhatsApp
              </Button>
            </div>
          </div>

          {(store.commercial_phone || store.store_address) && (
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
              {store.commercial_phone && (
                <a href={`tel:${store.commercial_phone}`} className="flex items-center gap-1 hover:text-gray-700">
                  <Phone className="w-3 h-3" /> {store.commercial_phone}
                </a>
              )}
              {store.store_address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {store.store_address}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Search */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">{filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Products Grid */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3" />
            <p>Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const photo = product.photos?.[0];
              const hasPromo = product.promotional_price && product.promotional_price < product.price;
              const inCart = cart.find((i) => i.product.id === product.id);
              const outOfStock = product.stock_quantity <= 0;

              return (
                <div key={product.id} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {photo ? (
                    <div className="aspect-square">
                      <img src={photo} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    )}
                    <div className="mt-2">
                      {hasPromo ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold" style={{ color: accentColor }}>
                            {formatCurrency(product.promotional_price!)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold" style={{ color: accentColor }}>
                          {formatCurrency(product.price)}
                        </span>
                      )}
                    </div>

                    {outOfStock ? (
                      <Badge variant="destructive" className="text-[10px] mt-2">Esgotado</Badge>
                    ) : inCart ? (
                      <div className="flex items-center gap-1 mt-2">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(product.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-semibold w-6 text-center">{inCart.quantity}</span>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(product.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full mt-2 text-xs gap-1 text-white"
                        style={{ backgroundColor: accentColor }}
                        onClick={() => addToCart(product)}
                      >
                        <Plus className="w-3 h-3" /> Adicionar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400 border-t bg-white">
        Catálogo digital • JTC FluxPDV
      </footer>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full px-5 py-3 text-white shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: accentColor }}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="font-bold">{cartCount}</span>
              <span className="text-sm">• {formatCurrency(cartTotal)}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Seu Pedido
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3 overflow-y-auto max-h-[50vh]">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  {item.product.photos?.[0] ? (
                    <img src={item.product.photos[0]} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(getProductPrice(item.product))} cada</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.product.id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.product.id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => removeFromCart(item.product.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span style={{ color: accentColor }}>{formatCurrency(cartTotal)}</span>
              </div>
              {store?.commercial_phone ? (
                <Button
                  className="w-full gap-2 text-white"
                  size="lg"
                  style={{ backgroundColor: "#25D366" }}
                  onClick={handleWhatsAppCheckout}
                >
                  <MessageCircle className="w-5 h-5" /> Finalizar pelo WhatsApp
                </Button>
              ) : (
                <p className="text-center text-sm text-gray-500">Esta loja não configurou um número para pedidos.</p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
