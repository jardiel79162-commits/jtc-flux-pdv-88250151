import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Download, 
  Upload, 
  PackageX,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  X,
  Package
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductsSkeleton } from "@/components/skeletons";
import AnimatedPage from "@/components/AnimatedPage";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto excluído com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir produto", variant: "destructive" });
    },
  });

  const escapeCsv = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const handleExportCsv = async () => {
    if (!products || products.length === 0) {
      toast({ title: "Nenhum produto para exportar", variant: "destructive" });
      return;
    }

    // Fetch image codes for all products
    const productIds = products.map(p => p.id);
    const { data: productImages } = await supabase
      .from("product_images")
      .select("product_id, image_code, image_url")
      .in("product_id", productIds);

    const imageMap = new Map<string, { code: string; url: string }>();
    productImages?.forEach(img => {
      if (!imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, { code: img.image_code, url: img.image_url });
      }
    });

    const header = "name,price,stock_quantity,barcode,description,min_stock_quantity,cost_price,product_type,image_code\n";
    const rows = products.map(p => {
      const img = imageMap.get(p.id);
      return [
        escapeCsv(p.name),
        p.price,
        p.stock_quantity || 0,
        escapeCsv(p.barcode || ""),
        escapeCsv(p.description || ""),
        p.min_stock_quantity || 0,
        p.cost_price || 0,
        escapeCsv(p.product_type || "unidade"),
        img?.code || "",
      ].join(",");
    }).join("\n");

    const bom = "\uFEFF";
    const csvContent = bom + header + rows;

    // Check if there are images to include
    const hasImages = Array.from(imageMap.values()).some(v => v.url);

    if (hasImages) {
      toast({ title: "Preparando exportação com imagens..." });
      const zip = new JSZip();
      zip.file("products.csv", csvContent);
      const imagesFolder = zip.folder("images");

      // Download and add images
      for (const [, img] of imageMap) {
        if (img.url) {
          try {
            const response = await fetch(img.url);
            if (response.ok) {
              const blob = await response.blob();
              const ext = img.url.split(".").pop()?.split("?")[0] || "jpg";
              imagesFolder?.file(`${img.code}.${ext}`, blob);
            }
          } catch {
            // Skip failed image downloads
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `produtos_fluxpdv_${new Date().toISOString().split("T")[0]}.zip`);
    } else {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `produtos_fluxpdv_${new Date().toISOString().split("T")[0]}.csv`);
    }

    toast({ title: "Produtos exportados com sucesso!" });
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { result.push(current.trim()); current = ""; }
        else { current += ch; }
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isZip = file.name.endsWith(".zip");
    const isCsv = file.name.endsWith(".csv");

    if (!isZip && !isCsv) {
      toast({ title: "Formato inválido", description: "Selecione um arquivo .csv ou .zip", variant: "destructive" });
      return;
    }

    setIsImporting(true);

    try {
      let csvContent = "";

      if (isZip) {
        const zip = await JSZip.loadAsync(file);
        // Find CSV file inside zip
        const csvFile = Object.keys(zip.files).find(name => name.endsWith(".csv"));
        if (!csvFile) throw new Error("Nenhum arquivo CSV encontrado dentro do ZIP.");
        csvContent = await zip.files[csvFile].async("string");
      } else {
        csvContent = await file.text();
      }

      csvContent = csvContent.replace(/^\uFEFF/, "");
      const lines = csvContent.split(/\r?\n/);
      if (lines.length <= 1) throw new Error("Arquivo vazio");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const headerParts = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
      const colIndex = (keys: string[]) => {
        for (const k of keys) {
          const idx = headerParts.indexOf(k);
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const iName = colIndex(["name", "nome"]);
      const iPrice = colIndex(["price", "preco"]);
      const iStock = colIndex(["stock_quantity", "stock", "estoque"]);
      const iBarcode = colIndex(["barcode"]);
      const iDesc = colIndex(["description", "descricao"]);
      const iMinStock = colIndex(["min_stock_quantity", "min_stock", "estoque_min"]);
      const iCost = colIndex(["cost_price", "preco_custo"]);
      const iType = colIndex(["product_type", "tipo", "unit"]);
      const iImageCode = colIndex(["image_code"]);

      if (iName === -1) throw new Error("Coluna 'name' não encontrada no cabeçalho.");

      const productsToImport: any[] = [];
      const imageCodes: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = parseCsvLine(line);
        const name = parts[iName]?.trim();
        if (!name) continue;

        const imageCode = iImageCode !== -1 ? parts[iImageCode]?.trim() || "" : "";

        productsToImport.push({
          user_id: user.id,
          name,
          price: iPrice !== -1 ? parseFloat((parts[iPrice] || "0").replace(",", ".")) || 0 : 0,
          stock_quantity: iStock !== -1 ? parseInt(parts[iStock] || "0") || 0 : 0,
          barcode: iBarcode !== -1 ? parts[iBarcode]?.trim() || null : null,
          description: iDesc !== -1 ? parts[iDesc]?.trim() || "" : "",
          min_stock_quantity: iMinStock !== -1 ? parseInt(parts[iMinStock] || "0") || 0 : 0,
          cost_price: iCost !== -1 ? parseFloat((parts[iCost] || "0").replace(",", ".")) || 0 : 0,
          product_type: iType !== -1 ? parts[iType]?.trim() || "unidade" : "unidade",
          _image_code: imageCode, // temporary, not sent to DB
        });
        imageCodes.push(imageCode);
      }

      if (productsToImport.length === 0) {
        toast({ title: "Nenhum produto válido encontrado", description: "Verifique a formatação do arquivo CSV.", variant: "destructive" });
        setIsImporting(false);
        return;
      }

      // Remove _image_code before inserting
      const cleanProducts = productsToImport.map(({ _image_code, ...rest }) => rest);

      const { data: inserted, error } = await supabase.from("products").insert(cleanProducts).select("id");
      if (error) throw error;

      // Link image_codes to inserted products
      if (inserted && iImageCode !== -1) {
        // Get existing image records for these codes
        const validCodes = imageCodes.filter(c => c);
        if (validCodes.length > 0) {
          const { data: existingImages } = await supabase
            .from("product_images")
            .select("id, image_code, image_url")
            .in("image_code", validCodes);

          const imagesByCode = new Map(existingImages?.map(img => [img.image_code, img]) || []);

          // For each inserted product, if it has an image_code that exists, update the product's photos
          for (let i = 0; i < inserted.length; i++) {
            const code = productsToImport[i]._image_code;
            const img = imagesByCode.get(code);
            if (img) {
              // Update product photos array
              await supabase.from("products").update({ photos: [img.image_url] }).eq("id", inserted[i].id);
              // Create new product_images link
              await supabase.from("product_images").insert({
                product_id: inserted[i].id,
                image_code: code + "_" + inserted[i].id.slice(0, 4), // unique code for new link
                image_url: img.image_url,
                user_id: user.id,
              });
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: `${inserted?.length || productsToImport.length} produtos importados com sucesso!` });
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro ao importar produtos",
        description: error.message || "Verifique se os dados estão no formato correto.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <ProductsSkeleton />;

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie seu catálogo de produtos e estoque.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportCsv} className="gap-2">
              <Download className="h-4 w-4" />
              Extrair (.CSV)
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="import-csv-input"
                onChange={handleImportCsv}
                disabled={isImporting}
              />
              <Button variant="outline" asChild disabled={isImporting} className="gap-2">
                <label htmlFor="import-csv-input" className="cursor-pointer">
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar (.CSV)
                </label>
              </Button>
            </div>

            <Button onClick={() => navigate("/produtos/novo")} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Desktop: tabela com foto */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <PackageX className="h-8 w-8 mb-2" />
                          <p>Nenhum produto encontrado.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts?.map((product) => {
                      const photo = product.photos?.[0];
                      return (
                        <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedProduct(product)}>
                          <TableCell className="w-[50px] pr-0">
                            {photo ? (
                              <img src={photo} alt={product.name} className="w-10 h-10 rounded-lg object-cover border" style={{ pointerEvents: 'auto' }} />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{product.name}</span>
                              <span className="text-xs text-muted-foreground">{product.barcode || "Sem código"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.categories?.name || "Sem categoria"}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={product.stock_quantity <= (product.min_stock_quantity || 0) ? "text-destructive font-bold" : ""}>
                                {product.stock_quantity} {product.product_type}
                              </span>
                              {product.stock_quantity <= (product.min_stock_quantity || 0) && (
                                <span className="text-[10px] text-destructive uppercase font-bold italic">Estoque Baixo</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"}>
                              {product.stock_quantity > 0 ? "Em estoque" : "Esgotado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedProduct(product)} title="Ver"><Eye className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/produtos/editar/${product.id}`)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Excluir este produto?")) deleteProduct.mutate(product.id); }} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: cards com foto */}
            <div className="md:hidden space-y-3">
              {filteredProducts?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <PackageX className="h-8 w-8 mb-2" />
                  <p>Nenhum produto encontrado.</p>
                </div>
              ) : (
                filteredProducts?.map((product) => {
                  const photo = product.photos?.[0];
                  return (
                    <div key={product.id} className="rounded-xl border bg-card p-3 space-y-3 active:scale-[0.99] transition-transform" onClick={() => setSelectedProduct(product)}>
                      <div className="flex items-center gap-3">
                        {photo ? (
                          <img src={photo} alt={product.name} className="w-14 h-14 rounded-xl object-cover border shrink-0" style={{ pointerEvents: 'auto' }} />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-7 h-7 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-sm">{product.name}</p>
                          <p className="text-[11px] text-muted-foreground">{product.barcode || "Sem código"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-sm text-primary">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)}
                            </span>
                            <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"} className="text-[9px] h-4 px-1.5">
                              {product.stock_quantity > 0 ? `${product.stock_quantity} un` : "Esgotado"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1 border-t" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => setSelectedProduct(product)}><Eye className="w-3.5 h-3.5" /> Ver</Button>
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => navigate(`/produtos/editar/${product.id}`)}><Pencil className="w-3.5 h-3.5" /> Editar</Button>
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Excluir este produto?")) deleteProduct.mutate(product.id); }}><Trash2 className="w-3.5 h-3.5" /> Excluir</Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal de detalhes do produto */}
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            {selectedProduct && (() => {
              const p = selectedProduct;
              const photo = p.photos?.[0];
              return (
                <div>
                  {photo ? (
                    <div className="w-full aspect-square bg-muted">
                      <img src={photo} alt={p.name} className="w-full h-full object-cover" style={{ pointerEvents: 'auto' }} />
                    </div>
                  ) : (
                    <div className="w-full aspect-[2/1] bg-muted flex items-center justify-center">
                      <Package className="w-16 h-16 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-5 space-y-4">
                    <div>
                      <h2 className="text-xl font-bold">{p.name}</h2>
                      {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Preço de venda</p>
                        <p className="text-lg font-bold text-primary">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price)}
                        </p>
                      </div>
                      {p.cost_price != null && p.cost_price > 0 && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Preço de custo</p>
                          <p className="text-lg font-bold">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.cost_price)}
                          </p>
                        </div>
                      )}
                      {p.promotional_price != null && p.promotional_price > 0 && (
                        <div className="rounded-lg bg-accent/10 p-3">
                          <p className="text-[10px] uppercase font-medium" style={{ color: 'hsl(var(--accent))' }}>Promoção</p>
                          <p className="text-lg font-bold" style={{ color: 'hsl(var(--accent))' }}>
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.promotional_price)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Estoque</p>
                        <p className={`text-lg font-bold ${p.stock_quantity <= (p.min_stock_quantity || 0) ? "text-destructive" : ""}`}>{p.stock_quantity}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Mínimo</p>
                        <p className="text-lg font-bold">{p.min_stock_quantity || 0}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Tipo</p>
                        <p className="text-sm font-medium mt-1">{p.product_type || "unidade"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.categories?.name && <Badge variant="outline">{p.categories.name}</Badge>}
                      {p.barcode && <Badge variant="secondary" className="font-mono text-xs">{p.barcode}</Badge>}
                      {p.internal_code && <Badge variant="secondary" className="text-xs">Cód: {p.internal_code}</Badge>}
                      <Badge variant={p.stock_quantity > 0 ? "default" : "destructive"}>
                        {p.stock_quantity > 0 ? "Em estoque" : "Esgotado"}
                      </Badge>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 gap-2" onClick={() => { setSelectedProduct(null); navigate(`/produtos/editar/${p.id}`); }}>
                        <Pencil className="w-4 h-4" /> Editar
                      </Button>
                      <Button variant="destructive" className="gap-2" onClick={() => { if (confirm("Excluir este produto?")) { deleteProduct.mutate(p.id); setSelectedProduct(null); } }}>
                        <Trash2 className="w-4 h-4" /> Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </AnimatedPage>
  );
};

export default Products;