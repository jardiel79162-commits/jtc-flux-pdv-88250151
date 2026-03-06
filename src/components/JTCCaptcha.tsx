import { useState, useCallback, useMemo } from "react";
import { CheckCircle2, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

import captchaRegister from "@/assets/captcha-register.png";
import captchaCart from "@/assets/captcha-cart.png";
import captchaVip from "@/assets/captcha-vip.png";

interface JTCCaptchaProps {
  onVerified: (verified: boolean) => void;
}

interface CaptchaImage {
  id: string;
  src: string;
  label: string;
}

const ALL_IMAGES: CaptchaImage[] = [
  { id: "register", src: captchaRegister, label: "Caixa Registradora" },
  { id: "cart", src: captchaCart, label: "Carrinho de Compras" },
  { id: "vip", src: captchaVip, label: "VIP" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateGrid() {
  // Pick the target image randomly
  const targetImage = ALL_IMAGES[Math.floor(Math.random() * ALL_IMAGES.length)];
  
  // We need exactly 3 correct cells + 6 wrong cells in a 3x3 grid
  const correctCount = 3;
  const wrongImages = ALL_IMAGES.filter(img => img.id !== targetImage.id);
  
  // Build 9 cells: 3 correct + 6 wrong (3 of each wrong type)
  const cells: { image: CaptchaImage; isCorrect: boolean; index: number }[] = [];
  
  for (let i = 0; i < correctCount; i++) {
    cells.push({ image: targetImage, isCorrect: true, index: 0 });
  }
  
  // Fill remaining 6 with wrong images (3 each)
  for (let i = 0; i < 3; i++) {
    cells.push({ image: wrongImages[0], isCorrect: false, index: 0 });
  }
  for (let i = 0; i < 3; i++) {
    cells.push({ image: wrongImages[1], isCorrect: false, index: 0 });
  }
  
  // Shuffle and assign indices
  const shuffled = shuffle(cells);
  return {
    targetImage,
    cells: shuffled.map((cell, idx) => ({ ...cell, index: idx })),
  };
}

export default function JTCCaptcha({ onVerified }: JTCCaptchaProps) {
  const [gridData, setGridData] = useState(() => generateGrid());
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const correctIndices = useMemo(
    () => new Set(gridData.cells.filter(c => c.isCorrect).map(c => c.index)),
    [gridData]
  );

  const refresh = useCallback(() => {
    setGridData(generateGrid());
    setSelectedIndices(new Set());
    setStatus("idle");
    onVerified(false);
  }, [onVerified]);

  const handleCellClick = (index: number) => {
    if (status === "correct" || cooldown > 0) return;

    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
    // Reset wrong status when user changes selection
    if (status === "wrong") setStatus("idle");
  };

  const handleVerify = () => {
    if (cooldown > 0 || status === "correct") return;

    // Check if selected exactly the correct 3 cells
    const isCorrect =
      selectedIndices.size === correctIndices.size &&
      [...selectedIndices].every(i => correctIndices.has(i));

    if (isCorrect) {
      setStatus("correct");
      onVerified(true);
    } else {
      setStatus("wrong");
      onVerified(false);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        const cd = Math.min(newAttempts * 5, 30);
        setCooldown(cd);
        const interval = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              refresh();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setTimeout(() => {
          refresh();
        }, 1500);
      }
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-300 ${
        status === "correct"
          ? "border-emerald-500/50 bg-emerald-500/5"
          : status === "wrong"
          ? "border-red-500/50 bg-red-500/5"
          : "border-border/50 bg-muted/20"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${status === "correct" ? "text-emerald-500" : "text-primary"}`} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Verificação de Segurança
          </span>
        </div>
        {status !== "correct" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={cooldown > 0}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {status === "correct" ? (
        <div className="flex items-center gap-2 py-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-500">Verificado com sucesso!</span>
        </div>
      ) : cooldown > 0 ? (
        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground">Muitas tentativas erradas.</p>
          <p className="text-lg font-bold text-primary mt-1">Tente novamente em {cooldown}s</p>
        </div>
      ) : (
        <>
          {/* Target image instruction */}
          <div className="text-center mb-3">
            <p className="text-sm font-semibold text-foreground mb-2">
              Selecione a imagem igual a essa:
            </p>
            <div className="inline-block rounded-xl border-2 border-primary/50 bg-primary/5 p-2">
              <img
                src={gridData.targetImage.src}
                alt={gridData.targetImage.label}
                className="w-16 h-16 object-contain"
                draggable={false}
              />
            </div>
          </div>

          {/* 3x3 Grid */}
          <div className="grid grid-cols-3 gap-2">
            {gridData.cells.map((cell) => {
              const isSelected = selectedIndices.has(cell.index);
              return (
                <button
                  key={cell.index}
                  type="button"
                  onClick={() => handleCellClick(cell.index)}
                  className={`relative aspect-square rounded-lg border-2 transition-all duration-200 p-2 flex items-center justify-center ${
                    isSelected
                      ? status === "wrong"
                        ? "border-red-500 bg-red-500/10"
                        : "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border/50 bg-background hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <img
                    src={cell.image.src}
                    alt=""
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 text-lg leading-none">
                      ✅
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Verify button */}
          <Button
            type="button"
            onClick={handleVerify}
            disabled={selectedIndices.size === 0}
            className="w-full mt-3 h-11 rounded-xl font-bold bg-gradient-to-r from-primary to-primary/90 shadow-md"
          >
            Verificar ({selectedIndices.size}/3 selecionadas)
          </Button>

          {status === "wrong" && (
            <p className="text-xs text-center text-red-500 font-medium mt-2">
              Seleção incorreta. Tente novamente!
            </p>
          )}
        </>
      )}

      <div className="flex items-center justify-center mt-2">
        <span className="text-[10px] text-muted-foreground/50">JTC FluxPDV Security</span>
      </div>
    </div>
  );
}
