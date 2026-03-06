import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Play, ShieldAlert, Eye, Check, X, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ── Prize definitions ──
const PRIZES = [
  { label: "Não Foi\nDessa Vez", emoji: "😥", color: "#4b5563", colorDark: "#374151", weight: 75, days: 0 },
  { label: "1 Semana\nGrátis", emoji: "🎁", color: "#3b82f6", colorDark: "#2563eb", weight: 10, days: 7 },
  { label: "1 Mês\nGrátis", emoji: "🎁", color: "#8b5cf6", colorDark: "#7c3aed", weight: 6, days: 30 },
  { label: "1 Ano\nGrátis", emoji: "🎉", color: "#f59e0b", colorDark: "#d97706", weight: 4, days: 365 },
  { label: "2 Anos\nGrátis", emoji: "🎉", color: "#ef4444", colorDark: "#dc2626", weight: 3, days: 730 },
  { label: "3 Anos\nGrátis", emoji: "🎉", color: "#ec4899", colorDark: "#db2777", weight: 1.5, days: 1095 },
  { label: "Acesso\nIlimitado", emoji: "🚀", color: "#10b981", colorDark: "#059669", weight: 0.5, days: 36500 },
];

const REQUIRED_ADS = 5;
const NUM_SLICES = PRIZES.length;
const SLICE_ANGLE = 360 / NUM_SLICES;

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
    await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
      method: "HEAD",
      mode: "no-cors",
    });
    return false;
  } catch {
    return true;
  }
}

// ── SVG helpers ──
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// ── Wheel SVG Component ──
const WheelSVG = () => {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
      {/* Outer decorative ring */}
      <circle cx={cx} cy={cy} r={radius + 6} fill="none" stroke="url(#outerGrad)" strokeWidth="4" />
      
      {/* Tick marks around edge */}
      {Array.from({ length: 28 }).map((_, i) => {
        const angle = (i * 360) / 28;
        const p1 = polarToCartesian(cx, cy, radius + 2, angle);
        const p2 = polarToCartesian(cx, cy, radius - 4, angle);
        return (
          <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
        );
      })}

      {/* Slices */}
      {PRIZES.map((prize, i) => {
        const startAngle = i * SLICE_ANGLE;
        const endAngle = startAngle + SLICE_ANGLE;
        const midAngle = startAngle + SLICE_ANGLE / 2;
        const textR = radius * 0.58;
        const emojiR = radius * 0.78;
        const textPos = polarToCartesian(cx, cy, textR, midAngle);
        const emojiPos = polarToCartesian(cx, cy, emojiR, midAngle);

        return (
          <g key={i}>
            {/* Gradient slice */}
            <defs>
              <linearGradient id={`sliceGrad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={prize.color} />
                <stop offset="100%" stopColor={prize.colorDark} />
              </linearGradient>
            </defs>
            <path
              d={describeArc(cx, cy, radius, startAngle, endAngle)}
              fill={`url(#sliceGrad${i})`}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.5"
            />

            {/* Inner shadow line */}
            <path
              d={describeArc(cx, cy, radius - 2, startAngle + 0.5, endAngle - 0.5)}
              fill="none"
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="1"
            />

            {/* Emoji */}
            <text
              x={emojiPos.x}
              y={emojiPos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="22"
              transform={`rotate(${midAngle}, ${emojiPos.x}, ${emojiPos.y})`}
            >
              {prize.emoji}
            </text>

            {/* Label text */}
            {prize.label.split("\n").map((line, li) => (
              <text
                key={li}
                x={textPos.x}
                y={textPos.y + (li - 0.5) * 12}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fontWeight="bold"
                fill="#fff"
                transform={`rotate(${midAngle}, ${textPos.x}, ${textPos.y + (li - 0.5) * 12})`}
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* Center hub */}
      <circle cx={cx} cy={cy} r="30" fill="url(#centerGrad)" stroke="rgba(255,255,255,0.8)" strokeWidth="3" />
      <circle cx={cx} cy={cy} r="22" fill="#1e293b" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize="18">🎰</text>

      {/* Defs */}
      <defs>
        <linearGradient id="outerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="33%" stopColor="#f59e0b" />
          <stop offset="66%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <radialGradient id="centerGrad">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </radialGradient>
      </defs>
    </svg>
  );
};

// ── Pointer Component ──
const Pointer = ({ isSpinning }: { isSpinning: boolean }) => (
  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
    <motion.div
      animate={isSpinning ? { rotateZ: [0, -15, 15, -10, 10, -5, 5, 0] } : {}}
      transition={{ duration: 0.6, repeat: isSpinning ? Infinity : 0, ease: "easeInOut" }}
    >
      <svg width="40" height="48" viewBox="0 0 40 48">
        <defs>
          <linearGradient id="pointerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="pointerShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.4)" />
          </filter>
        </defs>
        <path
          d="M20 46 L4 10 Q2 4 8 2 L20 0 L32 2 Q38 4 36 10 Z"
          fill="url(#pointerGrad)"
          stroke="#d97706"
          strokeWidth="1.5"
          filter="url(#pointerShadow)"
        />
        <circle cx="20" cy="12" r="4" fill="#fff" opacity="0.9" />
      </svg>
    </motion.div>
  </div>
);

// ── LED lights around the wheel ──
const LEDRing = ({ isSpinning }: { isSpinning: boolean }) => {
  const count = 24;
  const radius = 172;
  const cx = 176;
  const cy = 176;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ width: 352, height: 352 }}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i * 360) / count - 90;
        const rad = (angle * Math.PI) / 180;
        const x = cx + radius * Math.cos(rad);
        const y = cy + radius * Math.sin(rad);
        const colors = ["#facc15", "#ef4444", "#3b82f6", "#10b981"];
        const color = colors[i % colors.length];

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 8,
              height: 8,
              left: x - 4,
              top: y - 4,
              backgroundColor: color,
              boxShadow: `0 0 8px 2px ${color}80`,
            }}
            animate={
              isSpinning
                ? { opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }
                : { opacity: [0.5, 1, 0.5] }
            }
            transition={{
              duration: isSpinning ? 0.3 : 1.5,
              repeat: Infinity,
              delay: i * (isSpinning ? 0.05 : 0.1),
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
};

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
  const spinCountRef = useRef(0);

  const checkAdBlock = useCallback(async () => {
    setCheckingAdBlock(true);
    const blocked = await detectAdBlock();
    setAdBlockDetected(blocked);
    setCheckingAdBlock(false);
  }, []);

  useEffect(() => {
    checkAdBlock();
  }, [checkAdBlock]);

  const watchAd = () => {
    if (adsWatched >= REQUIRED_ADS) return;
    setWatchingAd(true);
    setAdTimer(5);

    const interval = setInterval(() => {
      setAdTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setWatchingAd(false);
          setAdsWatched((a) => {
            const next = a + 1;
            toast({
              title: `Anúncio ${next}/${REQUIRED_ADS} assistido!`,
              description: next >= REQUIRED_ADS ? "Você liberou a roleta! 🎉" : `Faltam ${REQUIRED_ADS - next} anúncios.`,
            });
            return next;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const spin = () => {
    if (isSpinning || adsWatched < REQUIRED_ADS) return;

    setIsSpinning(true);
    setShowResult(false);
    setWonPrize(null);
    spinCountRef.current += 1;

    const prizeIndex = pickPrize();
    const prize = PRIZES[prizeIndex];

    // Calculate landing: pointer is at top (0°). Slice i starts at i*SLICE_ANGLE.
    // We want the middle of the winning slice under the pointer.
    const targetSliceCenter = prizeIndex * SLICE_ANGLE + SLICE_ANGLE / 2;
    // Random offset within ±40% of slice to look natural
    const jitter = (Math.random() - 0.5) * SLICE_ANGLE * 0.7;
    const landAngle = 360 - targetSliceCenter + jitter;
    const fullSpins = (6 + Math.floor(Math.random() * 3)) * 360;
    const targetRotation = fullSpins + landAngle;

    setRotation((prev) => prev + targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(prize);
      setShowResult(true);
      setAdsWatched(0);

      if (prize.days > 0) {
        applyPrize(prize.days);
      }
    }, 5500);
  };

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

  // ── AdBlock screen ──
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
            <Button onClick={checkAdBlock} className="gap-2 rounded-xl">
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

          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }}
              initial={false}
              animate={{ width: `${(adsWatched / REQUIRED_ADS) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

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
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center text-sm font-semibold text-primary"
            >
              ✅ Roleta Liberada! Gire agora!
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Ad container */}
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

      {/* ═══════════ THE WHEEL ═══════════ */}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: 352, height: 376 }}>
          {/* LED ring */}
          <LEDRing isSpinning={isSpinning} />

          {/* Pointer */}
          <Pointer isSpinning={isSpinning} />

          {/* Wheel */}
          <div className="absolute" style={{ left: 16, top: 24, width: 320, height: 320 }}>
            <motion.div
              style={{ width: 320, height: 320 }}
              animate={{ rotate: rotation }}
              transition={{
                duration: 5.5,
                ease: [0.15, 0.85, 0.25, 1],
              }}
            >
              <WheelSVG />
            </motion.div>
          </div>

          {/* Platform base shadow */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[280px] h-4 rounded-[50%] bg-black/15 blur-md"
          />
        </div>

        {/* Spin button */}
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            onClick={spin}
            disabled={isSpinning || adsWatched < REQUIRED_ADS}
            className="mt-2 gap-2 rounded-full h-14 px-10 text-lg font-bold shadow-xl disabled:opacity-40 relative overflow-hidden"
            size="lg"
          >
            {/* Shimmer effect */}
            {!isSpinning && adsWatched >= REQUIRED_ADS && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
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
        </motion.div>
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
              initial={{ scale: 0.3, opacity: 0, rotateZ: -10 }}
              animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: "spring", damping: 18, stiffness: 200 }}
              className="bg-card rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-border relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background decoration */}
              <div className="absolute inset-0 opacity-5">
                {wonPrize.days > 0 && (
                  <div className="absolute inset-0" style={{
                    background: `radial-gradient(circle at 50% 50%, ${wonPrize.color}40, transparent 70%)`
                  }} />
                )}
              </div>

              <div className="relative z-10 space-y-4">
                {wonPrize.days > 0 ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="text-7xl"
                    >
                      {wonPrize.emoji}
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                    >
                      <div
                        className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                        style={{ backgroundColor: wonPrize.color + "22" }}
                      >
                        <Trophy className="w-8 h-8" style={{ color: wonPrize.color }} />
                      </div>
                    </motion.div>
                    <h2 className="text-2xl font-bold text-foreground">Parabéns! 🎉</h2>
                    <p className="text-lg font-semibold" style={{ color: wonPrize.color }}>
                      {wonPrize.label.replace("\n", " ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      O prêmio foi adicionado à sua assinatura automaticamente!
                    </p>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="text-7xl"
                    >
                      {wonPrize.emoji}
                    </motion.div>
                    <h2 className="text-xl font-bold text-foreground">{wonPrize.label.replace("\n", " ")}</h2>
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
              </div>
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
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: prize.color }}
                  />
                  <span className="text-lg">{prize.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{prize.label.replace("\n", " ")}</span>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: prize.color + "18", color: prize.color }}
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
