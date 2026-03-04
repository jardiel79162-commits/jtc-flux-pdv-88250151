import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Percent, ArrowDown, ArrowUp, RotateCcw, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export const PIX_FEE_RATE = 0.0049;

const CalculatorPage = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [passToCustomer, setPassToCustomer] = useState<boolean | null>(null);

  const numericAmount = parseFloat(amount.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
  const rawFee = numericAmount * PIX_FEE_RATE;
  const fee = numericAmount >= 1 ? Math.max(0.01, Math.ceil(rawFee * 100) / 100) : 0;
  const customerPays = passToCustomer ? numericAmount + fee : numericAmount;
  const youReceive = passToCustomer ? numericAmount : numericAmount - fee;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, "");
    if (value) {
      const numValue = parseInt(value) / 100;
      value = numValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    setAmount(value);
  };

  const handleClear = () => {
    setAmount("");
    setPassToCustomer(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto space-y-6"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Calculadora PIX</h1>
            <p className="text-sm text-muted-foreground">Calcule taxas de pagamento PIX</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">Valor da venda</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-medium">R$</span>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={amount}
                onChange={handleAmountChange}
                className="pl-12 text-xl h-14 font-semibold text-center"
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted/50 rounded-lg">
            <Percent className="h-4 w-4 text-foreground" />
            <span className="text-sm text-foreground">Taxa PIX: <span className="font-semibold">0,49%</span></span>
          </div>

          {numericAmount > 0 && numericAmount < 1 && (
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-sm font-medium text-green-600">🎉 Sem taxa! Valores abaixo de R$ 1,00 não têm cobrança</span>
            </div>
          )}

          {numericAmount > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-center text-foreground">Repassar taxa para o cliente?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={passToCustomer === true ? "default" : "outline"}
                  className={`h-12 ${passToCustomer === true ? "bg-primary" : ""}`}
                  onClick={() => setPassToCustomer(true)}
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Sim
                </Button>
                <Button
                  variant={passToCustomer === false ? "default" : "outline"}
                  className={`h-12 ${passToCustomer === false ? "bg-primary" : ""}`}
                  onClick={() => setPassToCustomer(false)}
                >
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Não
                </Button>
              </div>
            </div>
          )}

          {numericAmount > 0 && passToCustomer !== null && (
            <div className="space-y-4 p-4 bg-card rounded-xl border">
              {passToCustomer && (
                <div className="text-sm text-foreground bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                  <p>Valor original: R$ {numericAmount.toFixed(2)}</p>
                  <p>+ Taxa (0,49%): R$ {fee.toFixed(4)}</p>
                </div>
              )}
              {!passToCustomer && (
                <div className="text-sm text-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                  <p>Valor original: R$ {numericAmount.toFixed(2)}</p>
                  <p>- Taxa (0,49%): R$ {fee.toFixed(4)}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-medium">Cliente paga:</span>
                  <span className={`font-bold text-lg ${passToCustomer ? "text-amber-600" : "text-foreground"}`}>
                    R$ {customerPays.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <span className="text-foreground font-medium">Você recebe:</span>
                  <span className="font-bold text-xl text-green-600">
                    R$ {youReceive.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button variant="ghost" className="w-full" onClick={handleClear}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CalculatorPage;
