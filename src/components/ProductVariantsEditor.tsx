import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Shirt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ProductVariant {
  id?: string;
  size: string;
  color: string;
  stock_quantity: number;
  sku: string;
}

interface Props {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
}

const COMMON_SIZES = ["PP", "P", "M", "G", "GG", "XGG", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44"];
const COMMON_COLORS = ["Preto", "Branco", "Azul", "Vermelho", "Verde", "Amarelo", "Rosa", "Cinza", "Marrom", "Bege"];

export function ProductVariantsEditor({ variants, onChange }: Props) {
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newStock, setNewStock] = useState("0");
  const [newSku, setNewSku] = useState("");

  const addVariant = () => {
    if (!newSize && !newColor) return;
    onChange([
      ...variants,
      { size: newSize, color: newColor, stock_quantity: parseInt(newStock) || 0, sku: newSku },
    ]);
    setNewSize("");
    setNewColor("");
    setNewStock("0");
    setNewSku("");
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    onChange(variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const totalStock = variants.reduce((sum, v) => sum + v.stock_quantity, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shirt className="w-4 h-4" /> Variações do Produto
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Estoque total por variações: {totalStock} unidades
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing variants */}
        {variants.length > 0 && (
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg flex-wrap">
                <div className="flex-1 min-w-[80px]">
                  <p className="text-xs text-muted-foreground">Tamanho</p>
                  <Input
                    value={v.size}
                    onChange={(e) => updateVariant(i, "size", e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Ex: M"
                  />
                </div>
                <div className="flex-1 min-w-[80px]">
                  <p className="text-xs text-muted-foreground">Cor</p>
                  <Input
                    value={v.color}
                    onChange={(e) => updateVariant(i, "color", e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Ex: Preto"
                  />
                </div>
                <div className="w-20">
                  <p className="text-xs text-muted-foreground">Estoque</p>
                  <Input
                    type="number"
                    value={v.stock_quantity}
                    onChange={(e) => updateVariant(i, "stock_quantity", parseInt(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1 min-w-[80px]">
                  <p className="text-xs text-muted-foreground">SKU</p>
                  <Input
                    value={v.sku}
                    onChange={(e) => updateVariant(i, "sku", e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Opcional"
                  />
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive mt-4" onClick={() => removeVariant(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new variant */}
        <div className="border border-dashed border-border rounded-lg p-3 space-y-3">
          <p className="text-sm font-medium">Adicionar variação</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Tamanho</Label>
              <Select value={newSize} onValueChange={setNewSize}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="Ou digite..."
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cor</Label>
              <Select value={newColor} onValueChange={setNewColor}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_COLORS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="Ou digite..."
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Estoque</Label>
              <Input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SKU (opcional)</Label>
              <Input value={newSku} onChange={(e) => setNewSku(e.target.value)} className="h-8 text-sm" placeholder="Código" />
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addVariant} className="w-full gap-1">
            <Plus className="w-3 h-3" /> Adicionar Variação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
