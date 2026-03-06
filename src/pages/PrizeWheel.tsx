import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, ShieldAlert, Eye, Check, X, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PRIZES = [
  { label: "Não Foi Dessa Vez", emoji: "😥", color: "#4b5563", colorDark: "#374151", weight: 75, days: 0 },
  { label: "1 Semana Grátis", emoji: "🎁", color: "#3b82f6", colorDark: "#2563eb", weight: 10, days: 7 },
  { label: "1 Mês Grátis", emoji: "🎁", color: "#8b5cf6", colorDark: "#7c3aed", weight: 6, days: 30 },
  { label: "1 Ano Grátis", emoji: "🎉", color: "#f59e0b", colorDark: "#d97706", weight: 4, days: 365 },
  { label: "2 Anos Grátis", emoji: "🎉", color: "#ef4444", colorDark: "#dc2626", weight: 3, days: 730 },
  { label: "3 Anos Grátis", emoji: "🎉", color: "#ec4899", colorDark: "#db2777", weight: 1.5, days: 1095 },
  { label: "Acesso Ilimitado", emoji: "🚀", color: "#10b981", colorDark: "#059669", weight: 0.5, days: 36500 },
];

const REQUIRED_ADS = 5;
const NUM_SLICES = PRIZES.length;
const SLICE_DEG = 360 / NUM_SLICES;

function pickPrize(): number {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < PRIZES.length; i++) {
    r -= PRIZES[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

async function detectAdBlock(): Promise<boolean> {
  try {
    await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", { method: "HEAD", mode: "no-cors" });
    return false;
  } catch {
    return true;
  }
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, s: number, e: number) {
  const start = polar(cx, cy, r, e);
  const end = polar(cx, cy, r, s);
  const large = e - s > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

// ── SVG Wheel ──
const WheelSVG = () => {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 10;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
      <defs>
        {PRIZES.map((p, i) => (
          <linearGradient key={i} id={`sg${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={p.color} />
            <stop offset="100%" stopColor={p.colorDark} />
          </linearGradient>
        ))}
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke="url(#ringGrad)" strokeWidth="5" />

      {/* Tick marks */}
      {Array.from({ length: 28 }).map((_, i) => {
        const a = (i * 360) / 28;
        const p1 = polar(cx, cy, R + 2, a);
        const p2 = polar(cx, cy, R - 3, a);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />;
      })}

      {/* Slices with radially-oriented text */}
      {PRIZES.map((prize, i) => {
        const startA = i * SLICE_DEG;
        const endA = startA + SLICE_DEG;
        const midA = startA + SLICE_DEG / 2;

        return (
          <g key={i}>
            <path d={arcPath(cx, cy, R, startA, endA)} fill={`url(#sg${i})`} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

            {/* Text + emoji rotated along the slice radius (reading outward) */}
            <g transform={`rotate(${midA}, ${cx}, ${cy})`}>
              {/* Emoji near the edge */}
              <text x={cx} y={cy - R * 0.75} textAnchor="middle" dominantBaseline="central" fontSize="20">
                {prize.emoji}
              </text>
              {/* Label text along the radius */}
              <text
                x={cx}
                y={cy - R * 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9.5"
                fontWeight="bold"
                fill="#fff"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}
              >
                {prize.label}
              </text>
            </g>
          </g>
        );
      })}

      {/* Center circle - just structure, button overlaid via HTML */}
      <circle cx={cx} cy={cy} r="34" fill="#1e293b" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
    </svg>
  );
};

// ── Animated rainbow center button ──
const CenterButton = ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[60px] h-[60px] rounded-full flex items-center justify-center text-white font-extrabold text-xs uppercase tracking-wider disabled:opacity-40 transition-transform active:scale-90 select-none"
    style={{
      background: disabled
        ? "#475569"
        : "conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
      boxShadow: disabled ? "none" : "0 0 20px 4px rgba(139,92,246,0.4), inset 0 0 8px rgba(255,255,255,0.2)",
      border: "3px solid rgba(255,255,255,0.7)",
      animation: disabled ? "none" : "spin-rainbow 3s linear infinite",
    }}
  >
    <span className="drop-shadow-lg" style={{ animation: disabled ? "none" : "none" }}>GIRAR</span>
  </button>
);

// ── Pointer ──
const Pointer = ({ active }: { active: boolean }) => (
  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
    <motion.div
      animate={active ? { rotateZ: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
      transition={{ duration: 0.5, repeat: active ? Infinity : 0, ease: "easeInOut" }}
    >
      <svg width="36" height="44" viewBox="0 0 36 44">
        <defs>
          <linearGradient id="ptrG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="ptrS"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.35)" /></filter>
        </defs>
        <path d="M18 42 L3 10 Q1 4 7 2 L18 0 L29 2 Q35 4 33 10 Z" fill="url(#ptrG)" stroke="#d97706" strokeWidth="1.5" filter="url(#ptrS)" />
        <circle cx="18" cy="11" r="3.5" fill="#fff" opacity="0.85" />
      </svg>
    </motion.div>
  </div>
);

// ── LED ring ──
const LEDs = ({ active }: { active: boolean }) => {
  const count = 24;
  const r = 182;
  const c = 186;
  const colors = ["#facc15", "#ef4444", "#3b82f6", "#10b981"];

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ width: 372, height: 372 }}>
      {Array.from({ length: count }).map((_, i) => {
        const a = ((i * 360) / count - 90) * (Math.PI / 180);
        const x = c + r * Math.cos(a);
        const y = c + r * Math.sin(a);
        const col = colors[i % colors.length];
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: 8, height: 8, left: x - 4, top: y - 4, backgroundColor: col, boxShadow: `0 0 8px 2px ${col}80` }}
            animate={active ? { opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] } : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: active ? 0.25 : 1.5, repeat: Infinity, delay: i * (active ? 0.04 : 0.08), ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
};

// ═══ Main Component ═══
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

  const checkAdBlock = useCallback(async () => {
    setCheckingAdBlock(true);
    setAdBlockDetected(await detectAdBlock());
    setCheckingAdBlock(false);
  }, []);

  useEffect(() => { checkAdBlock(); }, [checkAdBlock]);

  const watchAd = () => {
    if (adsWatched >= REQUIRED_ADS) return;
    setWatchingAd(true);
    setAdTimer(5);
    const iv = setInterval(() => {
      setAdTimer((p) => {
        if (p <= 1) {
          clearInterval(iv);
          setWatchingAd(false);
          setAdsWatched((a) => {
            const n = a + 1;
            toast({ title: `Anúncio ${n}/${REQUIRED_ADS} assistido!`, description: n >= REQUIRED_ADS ? "Roleta liberada! 🎉" : `Faltam ${REQUIRED_ADS - n}.` });
            return n;
          });
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  };

  const spin = () => {
    if (isSpinning || adsWatched < REQUIRED_ADS) return;
    setIsSpinning(true);
    setShowResult(false);
    setWonPrize(null);

    const idx = pickPrize();
    const prize = PRIZES[idx];
    const center = idx * SLICE_DEG + SLICE_DEG / 2;
    const jitter = (Math.random() - 0.5) * SLICE_DEG * 0.6;
    const land = 360 - center + jitter;
    const spins = (7 + Math.floor(Math.random() * 3)) * 360;

    setRotation((prev) => prev + spins + land);

    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(prize);
      setShowResult(true);
      setAdsWatched(0);
      if (prize.days > 0) applyPrize(prize.days);
    }, 5500);
  };

  const applyPrize = async (days: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from("profiles").select("subscription_ends_at, trial_ends_at").eq("user_id", session.user.id).maybeSingle();
      if (!profile) return;
      const now = new Date();
      const cur = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : profile.trial_ends_at ? new Date(profile.trial_ends_at) : now;
      const base = cur > now ? cur : now;
      const newEnd = new Date(base.getTime() + days * 86400000);
      await supabase.from("profiles").update({ subscription_ends_at: newEnd.toISOString() }).eq("user_id", session.user.id);
    } catch (e) { console.error("Erro ao aplicar prêmio:", e); }
  };

  if (checkingAdBlock) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (adBlockDetected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full border-destructive/30">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto"><ShieldAlert className="w-10 h-10 text-destructive" /></div>
            <h2 className="text-xl font-bold text-foreground">Bloqueador de Anúncios Detectado</h2>
            <p className="text-muted-foreground text-sm">Desative seu bloqueador de anúncios para acessar a <strong>Roleta de Prêmios</strong>.</p>
            <Button onClick={checkAdBlock} className="gap-2 rounded-xl"><Check className="w-4 h-4" />Já Desativei</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-8">
      {/* Rainbow spin keyframe */}
      <style>{`@keyframes spin-rainbow { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }`}</style>

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold">
          <Gift className="w-4 h-4" />Roleta de Prêmios
        </div>
        <h1 className="text-2xl font-bold text-foreground">Gire e Ganhe!</h1>
        <p className="text-sm text-muted-foreground">Assista {REQUIRED_ADS} anúncios para liberar uma rodada</p>
      </div>

      {/* Ad Progress */}
      <Card className="overflow-hidden">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Anúncios Assistidos</span>
            <span className="text-sm font-bold text-primary">{adsWatched}/{REQUIRED_ADS}</span>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }} initial={false} animate={{ width: `${(adsWatched / REQUIRED_ADS) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
          <div className="flex justify-between">
            {Array.from({ length: REQUIRED_ADS }).map((_, i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${i < adsWatched ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground"}`}>
                {i < adsWatched ? <Check className="w-4 h-4" /> : i + 1}
              </div>
            ))}
          </div>
          {adsWatched < REQUIRED_ADS && (
            <Button onClick={watchAd} disabled={watchingAd} className="w-full gap-2 rounded-xl h-12" variant={watchingAd ? "secondary" : "default"}>
              {watchingAd ? <><Loader2 className="w-4 h-4 animate-spin" />Assistindo... ({adTimer}s)</> : <><Eye className="w-4 h-4" />Assistir Anúncio {adsWatched + 1}</>}
            </Button>
          )}
          {adsWatched >= REQUIRED_ADS && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center text-sm font-semibold text-primary">
              ✅ Roleta Liberada! Gire agora!
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Ad container */}
      <AnimatePresence>
        {watchingAd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="overflow-hidden border-primary/30">
              <CardContent className="py-8 text-center space-y-3">
                <div className="text-4xl">📺</div>
                <p className="text-sm text-muted-foreground font-medium">Anúncio em exibição...</p>
                <div id="prize-wheel-ad-container" className="min-h-[100px] bg-muted/50 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Espaço reservado para anúncio</span>
                </div>
                <div className="text-2xl font-bold text-primary">{adTimer}s</div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ THE WHEEL ═══ */}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: 372, height: 396 }}>
          <LEDs active={isSpinning} />
          <Pointer active={isSpinning} />

          {/* Spinning wheel */}
          <div className="absolute" style={{ left: 16, top: 24, width: 340, height: 340 }}>
            <motion.div
              style={{ width: 340, height: 340 }}
              animate={{ rotate: rotation }}
              transition={{ duration: 5.5, ease: [0.12, 0.84, 0.18, 1] }}
            >
              <WheelSVG />
            </motion.div>
          </div>

          {/* Center rainbow button */}
          <div className="absolute" style={{ left: 16, top: 24, width: 340, height: 340 }}>
            <CenterButton onClick={spin} disabled={isSpinning || adsWatched < REQUIRED_ADS} />
          </div>

          {/* Shadow base */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[280px] h-4 rounded-[50%] bg-black/15 blur-md" />
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {showResult && wonPrize && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowResult(false)}>
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: "spring", damping: 18, stiffness: 200 }}
              className="bg-card rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-border relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {wonPrize.days > 0 && <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle, ${wonPrize.color}40, transparent 70%)` }} />}
              <div className="relative z-10 space-y-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="text-7xl">{wonPrize.emoji}</motion.div>
                {wonPrize.days > 0 ? (
                  <>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring" }}>
                      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: wonPrize.color + "22" }}>
                        <Trophy className="w-8 h-8" style={{ color: wonPrize.color }} />
                      </div>
                    </motion.div>
                    <h2 className="text-2xl font-bold text-foreground">Parabéns! 🎉</h2>
                    <p className="text-lg font-semibold" style={{ color: wonPrize.color }}>{wonPrize.label}</p>
                    <p className="text-sm text-muted-foreground">O prêmio foi adicionado à sua assinatura!</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-foreground">{wonPrize.label}</h2>
                    <p className="text-sm text-muted-foreground">Tente novamente! Assista mais {REQUIRED_ADS} anúncios.</p>
                  </>
                )}
                <Button onClick={() => setShowResult(false)} variant="outline" className="rounded-xl gap-2"><X className="w-4 h-4" />Fechar</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrizeWheel;
