import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Download,
  Upload,
  FileText,
  Loader2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import AnimatedPage from "@/components/AnimatedPage";
import { ProductsSkeleton } from "@/components/skeletons";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string | null;
  barcode: string | null;
  description: string | null;
  unit: string | null;
  min_stock: number | null;
  cost_price: number | null;
}

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Produto excluído com sucesso" });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportTxt = () => {
    if (products.length === 0) {
      toast({ title: "Aviso", description: "Não há produtos para exportar." });
      return;
    }

    // Cabeçalho do arquivo
    const header = "NOME|PRECO|ESTOQUE|CATEGORIA|BARCODE|DESCRICAO|UNIDADE|ESTOQUE_MIN|PRECO_CUSTO\n";
    
    const content = products.map(p => 
      `${p.name || ''}|${p.price || 0}|${p.stock || 0}|${p.category || ''}|${p.barcode || ''}|${(p.description || '').replace(/\n/g, ' ')}|${p.unit || ''}|${p.min_stock || 0}|${p.cost_price || 0}`
    ).join("\n");

    const blob = new Blob([header + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `produtos_fluxpdv_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Sucesso", description: "Arquivo de produtos gerado com sucesso!" });
  };

  const handleImportTxt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.txt')) {
      toast({ title: "Erro", description: "Por favor, selecione um arquivo .TXT válido.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuário não autenticado");

        const productsToUpsert = [];

        // Pular a primeira linha (cabeçalho) se ela contiver as palavras-chave
        const startLine = lines[0].toUpperCase().includes("NOME|") ? 1 : 0;

        for (let i = startLine; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const [name, price, stock, category, barcode, description, unit, min_stock, cost_price] = line.split("|");

          if (!name || !price) continue;

          productsToUpsert.push({
            user_id: user.id,
            name: name.trim(),
            price: parseFloat(price) || 0,
            stock: parseFloat(stock) || 0,
            category: category?.trim() || null,
            barcode: barcode?.trim() || null,
            description: description?.trim() || null,
            unit: unit?.trim() || null,
            min_stock: parseFloat(min_stock) || 0,
            cost_price: parseFloat(cost_price) || 0,
          });
        }

        if (productsToUpsert.length === 0) {
          throw new Error("Nenhum produto válido encontrado no arquivo.");
        }

        // Upsert baseado no nome e barcode para evitar duplicatas simples
        const { error } = await supabase
          .from("products")
          .upsert(productsToUpsert, { onConflict: 'user_id, name' });

        if (error) throw error;

        toast({ 
          title: "Importação concluída", 
          description: `${productsToUpsert.length} produtos foram processados com sucesso.` 
        });
        fetchProducts();
      } catch (error: any) {
        toast({
          title: "Erro na importação",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
        if (event.target) event.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && products.length === 0) {
    return <ProductsSkeleton />;
  }

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie seu estoque e catálogo de produtos
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportTxt} className="gap-2">
              <Download className="h-4 w-4" />
              Extrair
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept=".txt"
                className="hidden"
                id="import-txt-input"
                onChange={handleImportTxt}
                disabled={isImporting}
              />
              <Button variant="outline" asChild disabled={isImporting} className="gap-2 cursor-pointer">
                <label htmlFor="import-txt-input">
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar
                </label>
              </Button>
            </div>

            <Button onClick={() => navigate("/produtos/novo")} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-card p-3 rounded-lg border border-border/50">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código de barras ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Package className="h-8 w-8 mb-2 opacity-20" />
                      <p>Nenhum produto encontrado</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{product.name}</span>
                        {product.barcode && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {product.barcode}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="secondary" className="font-normal">
                          {product.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(product.price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${product.stock <= (product.min_stock || 0) ? 'text-destructive' : ''}`}>
                          {product.stock}
                        </span>
                        <span className="text-xs text-muted-foreground">{product.unit || 'un'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/produtos/editar/${product.id}`)}
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AnimatedPage>
  );
};

export default Products;