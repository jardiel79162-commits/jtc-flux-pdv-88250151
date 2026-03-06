import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Play, ShieldAlert, RefreshCw, Eye, Check, X, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ── Prize definitions ──
const PRIZES = [
  { label: "Não Foi Dessa Vez", emoji: "😥", color: "#6b7280", weight: 75, days: 0 },
  { label: "1 Semana Grátis", emoji: "🎁", color: "#3b82f6", weight: 10, days: 7 },
  { label: "1 Mês Grátis", emoji: "🎁", color: "#8b5cf6", weight: 6, days: 30 },
  { label: "1 Ano Grátis", emoji: "🎉", color: "#f59e0b", weight: 4, days: 365 },
  { label: "2 Anos Grátis", emoji: "🎉", color: "#ef4444", weight: 3, days: 730 },
  { label: "3 Anos Grátis", emoji: "🎉", color: "#ec4899", weight: 1.5, days: 1095 },
  { label: "Acesso Ilimitado", emoji: "🚀", color: "#10b981", weight: 0.5, days: 36500 },
];

const REQUIRED_ADS = 5;

// ── Weighted random pick ──
function pickPrize(): number {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < PRIZES.length; i++) {
    r -= PRIZES[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

// ── AdBlock detection ──
async function detectAdBlock(): Promise<boolean> {
  try {
    // Try fetching a known ad script path
    const res = await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
      method: "HEAD",
      mode: "no-cors",
    });
    return false;
  } catch {
    return true;
  }
}

const PrizeWheel = () => {
  const [adsWatched, setAdsWatched] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<typeof PRIZES[0] | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [checkingAdBlock, setCheckingAdBlock] = useState(true);
  const [watchingAd, setWatchingAd] = useState(false);
  const [adTimer, setAdTimer] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // ── Check AdBlock on mount ──
  const checkAdBlock = useCallback(async () => {
    setCheckingAdBlock(true);
    const blocked = await detectAdBlock();
    setAdBlockDetected(blocked);
    setCheckingAdBlock(false);
  }, []);

  useEffect(() => {
    checkAdBlock();
  }, [checkAdBlock]);

  // ── Draw wheel on canvas ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 300;
    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2); // retina

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;
    const sliceAngle = (2 * Math.PI) / PRIZES.length;

    PRIZES.forEach((prize, i) => {
      const start = i * sliceAngle - Math.PI / 2;
      const end = start + sliceAngle;

      // Slice
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 3;
      ctx.fillText(prize.emoji, radius * 0.6, 4);
      ctx.font = "bold 8px sans-serif";
      ctx.fillText(prize.label.length > 14 ? prize.label.slice(0, 14) + "…" : prize.label, radius * 0.38, 4);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎰", cx, cy + 4);
  }, []);

  // ── Simulate watching an ad ──
  const watchAd = () => {
    if (adsWatched >= REQUIRED_ADS) return;
    setWatchingAd(true);
    setAdTimer(5);

    // This is a placeholder for real Google Ads integration
    // The ad container div will be where Google Ads renders
    const interval = setInterval(() => {
      setAdTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setWatchingAd(false);
          setAdsWatched((a) => a + 1);
          toast({
            title: `Anúncio ${adsWatched + 1}/${REQUIRED_ADS} assistido!`,
            description: adsWatched + 1 >= REQUIRED_ADS ? "Você liberou a roleta! 🎉" : `Faltam ${REQUIRED_ADS - adsWatched - 1} anúncios.`,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Spin the wheel ──
  const spin = () => {
    if (isSpinning || adsWatched < REQUIRED_ADS) return;

    setIsSpinning(true);
    setShowResult(false);
    setWonPrize(null);

    const prizeIndex = pickPrize();
    const prize = PRIZES[prizeIndex];

    // Calculate target rotation
    const sliceAngle = 360 / PRIZES.length;
    // The pointer is at the top. We need the winning slice to end under the pointer.
    const targetSliceCenter = prizeIndex * sliceAngle;
    // Spin at least 5 full rotations + offset to land on prize
    const extraSpins = 5 * 360;
    const targetRotation = extraSpins + (360 - targetSliceCenter);

    setRotation((prev) => prev + targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(prize);
      setShowResult(true);
      // Reset ads for next spin
      setAdsWatched(0);

      // Apply prize if it has days
      if (prize.days > 0) {
        applyPrize(prize.days);
      }
    }, 4500);
  };

  // ── Apply prize to subscription ──
  const applyPrize = async (days: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_ends_at, trial_ends_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profile) return;

      const now = new Date();
      const currentEnd = profile.subscription_ends_at
        ? new Date(profile.subscription_ends_at)
        : profile.trial_ends_at
          ? new Date(profile.trial_ends_at)
          : now;

      const base = currentEnd > now ? currentEnd : now;
      const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

      await supabase
        .from("profiles")
        .update({ subscription_ends_at: newEnd.toISOString() })
        .eq("user_id", session.user.id);
    } catch (err) {
      console.error("Erro ao aplicar prêmio:", err);
    }
  };

  // ── AdBlock blocked screen ──
  if (checkingAdBlock) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (adBlockDetected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full border-destructive/30">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Bloqueador de Anúncios Detectado</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Para acessar a <strong>Roleta de Prêmios</strong>, é necessário desativar seu bloqueador de anúncios (AdBlock, uBlock, etc).
            </p>
            <p className="text-muted-foreground text-xs">
              Os anúncios nos ajudam a manter os prêmios disponíveis para todos os usuários.
            </p>
            <Button
              onClick={checkAdBlock}
              className="gap-2 rounded-xl"
            >
              <Check className="w-4 h-4" />
              Já Desativei
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold">
          <Gift className="w-4 h-4" />
          Roleta de Prêmios
        </div>
        <h1 className="text-2xl font-bold text-foreground">Gire e Ganhe!</h1>
        <p className="text-sm text-muted-foreground">
          Assista {REQUIRED_ADS} anúncios para liberar uma rodada
        </p>
      </div>

      {/* Ad Progress */}
      <Card className="overflow-hidden">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Anúncios Assistidos</span>
            <span className="text-sm font-bold text-primary">{adsWatched}/{REQUIRED_ADS}</span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }}
              initial={false}
              animate={{ width: `${(adsWatched / REQUIRED_ADS) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* Progress dots */}
          <div className="flex justify-between">
            {Array.from({ length: REQUIRED_ADS }).map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < adsWatched
                    ? "bg-primary text-primary-foreground scale-110"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < adsWatched ? <Check className="w-4 h-4" /> : i + 1}
              </div>
            ))}
          </div>

          {adsWatched < REQUIRED_ADS && (
            <Button
              onClick={watchAd}
              disabled={watchingAd}
              className="w-full gap-2 rounded-xl h-12"
              variant={watchingAd ? "secondary" : "default"}
            >
              {watchingAd ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Assistindo... ({adTimer}s)
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Assistir Anúncio {adsWatched + 1}
                </>
              )}
            </Button>
          )}

          {adsWatched >= REQUIRED_ADS && (
            <div className="text-center text-sm font-semibold text-primary animate-pulse">
              ✅ Roleta Liberada! Gire agora!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ad container placeholder for Google Ads */}
      <AnimatePresence>
        {watchingAd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="overflow-hidden border-primary/30">
              <CardContent className="py-8">
                <div className="text-center space-y-3">
                  <div className="text-4xl">📺</div>
                  <p className="text-sm text-muted-foreground font-medium">Anúncio em exibição...</p>
                  {/* Google Ads will render here */}
                  <div
                    id="prize-wheel-ad-container"
                    className="min-h-[100px] bg-muted/50 rounded-lg flex items-center justify-center"
                  >
                    <span className="text-xs text-muted-foreground">Espaço reservado para anúncio</span>
                  </div>
                  <div className="text-2xl font-bold text-primary">{adTimer}s</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wheel */}
      <div className="relative flex flex-col items-center">
        {/* Pointer */}
        <div className="relative z-10 -mb-2">
          <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
        </div>

        {/* Wheel container */}
        <div
          ref={wheelRef}
          className="relative select-none"
          style={{
            width: 300,
            height: 300,
          }}
        >
          {/* Outer glow */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 blur-xl animate-pulse" />

          {/* Outer ring */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary via-accent to-primary p-[3px]">
            <div className="w-full h-full rounded-full bg-card" />
          </div>

          {/* Canvas wheel */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: rotation }}
            transition={{
              duration: 4.5,
              ease: [0.2, 0.8, 0.3, 1],
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full rounded-full"
              style={{ width: 300, height: 300 }}
            />
          </motion.div>
        </div>

        {/* Spin button */}
        <Button
          onClick={spin}
          disabled={isSpinning || adsWatched < REQUIRED_ADS}
          className="mt-6 gap-2 rounded-full h-14 px-10 text-lg font-bold shadow-lg disabled:opacity-40"
          size="lg"
        >
          {isSpinning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Girando...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Girar Roleta
            </>
          )}
        </Button>
      </div>

      {/* Result modal */}
      <AnimatePresence>
        {showResult && wonPrize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-card rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {wonPrize.days > 0 ? (
                <>
                  <div className="text-6xl">{wonPrize.emoji}</div>
                  <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: wonPrize.color + "22" }}>
                    <Trophy className="w-8 h-8" style={{ color: wonPrize.color }} />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Parabéns! 🎉</h2>
                  <p className="text-lg font-semibold" style={{ color: wonPrize.color }}>
                    {wonPrize.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    O prêmio foi adicionado à sua assinatura automaticamente!
                  </p>
                </>
              ) : (
                <>
                  <div className="text-6xl">{wonPrize.emoji}</div>
                  <h2 className="text-xl font-bold text-foreground">{wonPrize.label}</h2>
                  <p className="text-sm text-muted-foreground">
                    Tente novamente! Assista mais {REQUIRED_ADS} anúncios para uma nova rodada.
                  </p>
                </>
              )}
              <Button
                onClick={() => setShowResult(false)}
                variant="outline"
                className="rounded-xl gap-2"
              >
                <X className="w-4 h-4" />
                Fechar
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prizes table */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Tabela de Prêmios
          </h3>
          <div className="space-y-2">
            {PRIZES.map((prize, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{prize.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{prize.label}</span>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: prize.color + "22", color: prize.color }}
                >
                  {prize.weight}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrizeWheel;
