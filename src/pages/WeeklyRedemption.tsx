import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Lock, Clock, CheckCircle2, Trophy, X, Sparkles } from "lucide-react";
import PageLoader from "@/components/PageLoader";
import confetti from "canvas-confetti";

const GIFTS = [
  { label: "Não Foi Dessa Vez", emoji: "😥", days: 0, weight: 65.5, color: "#64748b" },
  { label: "1 Dia Grátis", emoji: "🎁", days: 1, weight: 10, color: "#3b82f6" },
  { label: "3 Dias Grátis", emoji: "🎁", days: 3, weight: 8, color: "#6366f1" },
  { label: "7 Dias Grátis", emoji: "🎁", days: 7, weight: 6, color: "#8b5cf6" },
  { label: "15 Dias Grátis", emoji: "🎉", days: 15, weight: 4, color: "#a855f7" },
  { label: "1 Mês Grátis", emoji: "🎉", days: 30, weight: 3, color: "#f59e0b" },
  { label: "3 Meses Grátis", emoji: "🏆", days: 90, weight: 2, color: "#ef4444" },
  { label: "6 Meses Grátis", emoji: "🏆", days: 180, weight: 1, color: "#ec4899" },
  { label: "1 Ano Grátis", emoji: "🚀", days: 365, weight: 0.5, color: "#10b981" },
];

function pickGift() {
  const total = GIFTS.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < GIFTS.length; i++) {
    r -= GIFTS[i].weight;
    if (r <= 0) return GIFTS[i];
  }
  return GIFTS[0];
}

const WeeklyRedemption = () => {
  const { toast } = useToast();
  const { isAdmin, hasPermission, loading: permissionsLoading } = usePermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [isEventActive, setIsEventActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [nextEventTime, setNextEventTime] = useState("");
  const [alreadyRedeemed, setAlreadyRedeemed] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [phase, setPhase] = useState<"idle" | "shaking" | "exploding" | "revealed">("idle");
  const [wonPrize, setWonPrize] = useState<typeof GIFTS[0] | null>(null);
  const [eventSettings, setEventSettings] = useState<{ day: number; hour: number; minute: number; duration: number } | null>(null);

  const canAccessRedemption = isAdmin || hasPermission(PERMISSION_KEYS.access_redemption);

  const checkAlreadyRedeemed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diff);
      weekStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("weekly_redemption_codes")
        .select("is_used")
        .eq("user_id", user.id)
        .gte("week_start", weekStart.toISOString().split("T")[0])
        .maybeSingle();
      return data?.is_used || false;
    } catch { return false; }
  }, []);

  const loadEventSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("system_settings_global")
        .select("redemption_event_day, redemption_event_hour, redemption_event_minute, redemption_event_duration")
        .limit(1)
        .maybeSingle();
      if (!data) return { day: 1, hour: 16, minute: 0, duration: 60 };
      return {
        day: (data as any).redemption_event_day ?? 1,
        hour: (data as any).redemption_event_hour ?? 16,
        minute: (data as any).redemption_event_minute ?? 0,
        duration: (data as any).redemption_event_duration ?? 60,
      };
    } catch { return { day: 1, hour: 16, minute: 0, duration: 60 }; }
  }, []);

  useEffect(() => { loadEventSettings().then(setEventSettings); }, [loadEventSettings]);

  const checkEventStatus = useCallback(() => {
    if (!eventSettings) return false;
    const { day: eventDay, hour: eventHour, minute: eventMinute, duration: eventDuration } = eventSettings;
    const now = new Date();
    const brazilOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const diffMinutes = brazilOffset - (-localOffset);
    const brazilTime = new Date(now.getTime() + diffMinutes * 60 * 1000);
    const dayOfWeek = brazilTime.getDay();
    const hours = brazilTime.getHours();
    const minutes = brazilTime.getMinutes();
    const seconds = brazilTime.getSeconds();
    const eventStartMinutes = eventHour * 60 + eventMinute;
    const eventEndMinutes = eventStartMinutes + eventDuration;
    const currentMinutes = hours * 60 + minutes;
    const isCorrectDay = dayOfWeek === eventDay;
    const isInTimeWindow = currentMinutes >= eventStartMinutes && currentMinutes < eventEndMinutes;
    if (isCorrectDay && isInTimeWindow) {
      const remainingTotalSeconds = (eventEndMinutes - currentMinutes) * 60 - seconds;
      const remainingMin = Math.floor(remainingTotalSeconds / 60);
      const remainingSec = remainingTotalSeconds % 60;
      setTimeRemaining(`${String(remainingMin).padStart(2, "0")}:${String(remainingSec).padStart(2, "0")}`);
      return true;
    }
    const daysUntil = dayOfWeek === eventDay && currentMinutes < eventStartMinutes
      ? 0
      : ((eventDay - dayOfWeek + 7) % 7) || 7;
    const nextEvent = new Date(brazilTime);
    nextEvent.setDate(brazilTime.getDate() + daysUntil);
    const nextEventDate = nextEvent.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
    setNextEventTime(`${nextEventDate} às ${String(eventHour).padStart(2, "0")}:${String(eventMinute).padStart(2, "0")}`);
    return false;
  }, [eventSettings]);

  useEffect(() => {
    const init = async () => {
      if (permissionsLoading) return;
      if (canAccessRedemption) {
        const redeemed = await checkAlreadyRedeemed();
        setAlreadyRedeemed(redeemed);
        checkEventStatus();
        setIsEventActive(checkEventStatus());
      }
      setIsLoading(false);
    };
    init();
    const interval = setInterval(() => { setIsEventActive(checkEventStatus()); }, 1000);
    return () => clearInterval(interval);
  }, [permissionsLoading, canAccessRedemption, checkAlreadyRedeemed, checkEventStatus]);

  const openGift = async () => {
    if (isOpening || alreadyRedeemed) return;
    setIsOpening(true);
    setPhase("shaking");

    const prize = pickGift();

    // Shaking phase
    await new Promise(r => setTimeout(r, 1800));
    setPhase("exploding");

    // Explosion phase
    await new Promise(r => setTimeout(r, 800));
    setWonPrize(prize);
    setPhase("revealed");

    if (prize.days > 0) {
      confetti({ particleCount: 250, spread: 120, origin: { y: 0.5 }, colors: ["#4C6FFF", "#00E0A4", "#FFD700", "#ef4444", "#ec4899"] });
    }

    // Save to DB
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.rpc("open_weekly_gift" as any, {
        p_user_id: user.id,
        p_prize_label: prize.label,
        p_days_added: prize.days,
      });
      setAlreadyRedeemed(true);
    } catch (e) {
      console.error("Erro ao salvar presente:", e);
    }

    setIsOpening(false);
  };

  const closeResult = () => {
    setPhase("idle");
    setWonPrize(null);
  };

  if (isLoading) {
    return (
      <PageLoader pageName="Presente Misterioso">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </PageLoader>
    );
  }

  return (
    <PageLoader pageName="Presente Misterioso">
      <div className="space-y-6 max-w-lg mx-auto pb-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold">
            <Gift className="w-4 h-4" />Presente Misterioso
          </div>
          <h1 className="text-2xl font-bold text-foreground">Abra e Descubra!</h1>
          <p className="text-sm text-muted-foreground">Toda semana um presente especial espera por você</p>
        </div>

        {/* No permission */}
        {!canAccessRedemption && (
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
            </CardContent>
          </Card>
        )}

        {/* Already redeemed & no result showing */}
        {canAccessRedemption && alreadyRedeemed && phase !== "revealed" && (
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Já Aberto!</h2>
              <p className="text-muted-foreground mb-4">Você já abriu seu presente desta semana.</p>
              {nextEventTime && (
                <div className="bg-muted rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">Próximo presente:</p>
                  <p className="text-lg font-bold text-primary capitalize">{nextEventTime}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Event not active */}
        {canAccessRedemption && !alreadyRedeemed && !isEventActive && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-muted to-muted/50 p-8 flex justify-center">
              <div className="w-32 h-32 opacity-40 grayscale flex items-center justify-center text-7xl">🎁</div>
            </div>
            <CardContent className="pt-6 pb-8 text-center">
              <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Evento Indisponível</h2>
              <p className="text-muted-foreground mb-4">O presente só pode ser aberto durante o horário do evento.</p>
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Próximo presente:</p>
                <p className="text-lg font-bold text-primary capitalize">{nextEventTime}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event active - Gift Box */}
        {canAccessRedemption && !alreadyRedeemed && isEventActive && (
          <div className="flex flex-col items-center gap-6">
            {/* Timer */}
            <div className="bg-destructive/10 rounded-2xl px-6 py-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-destructive animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground">Tempo restante:</span>
              <span className="text-2xl font-mono font-bold text-destructive tracking-wider">{timeRemaining}</span>
            </div>

            {/* The Gift Box */}
            <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
              {/* Glow behind */}
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl animate-pulse" />

              {/* Sparkle particles */}
              {phase === "idle" && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], y: [0, -20, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      style={{
                        left: `${30 + Math.random() * 40}%`,
                        top: `${20 + Math.random() * 40}%`,
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </motion.div>
                  ))}
                </>
              )}

              {/* Gift box */}
              <AnimatePresence mode="wait">
                {phase !== "exploding" && phase !== "revealed" && (
                  <motion.button
                    onClick={openGift}
                    disabled={isOpening}
                    className="relative z-10 select-none cursor-pointer disabled:cursor-wait"
                    animate={
                      phase === "shaking"
                        ? {
                            rotate: [0, -8, 8, -10, 10, -12, 12, -8, 8, -4, 4, 0],
                            scale: [1, 1.02, 1.02, 1.05, 1.05, 1.08, 1.08, 1.05, 1.05, 1.02, 1.02, 1],
                          }
                        : { scale: [1, 1.03, 1], rotate: [0, -1, 1, 0] }
                    }
                    transition={
                      phase === "shaking"
                        ? { duration: 1.8, ease: "easeInOut" }
                        : { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }
                    whileHover={phase === "idle" ? { scale: 1.08 } : {}}
                    whileTap={phase === "idle" ? { scale: 0.95 } : {}}
                    exit={{ scale: 2, opacity: 0, rotate: 15 }}
                  >
                    {/* Box SVG */}
                    <svg width="180" height="200" viewBox="0 0 180 200">
                      <defs>
                        <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="100%" stopColor="hsl(var(--primary) / 0.7)" />
                        </linearGradient>
                        <linearGradient id="boxSide" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(var(--primary) / 0.5)" />
                          <stop offset="100%" stopColor="hsl(var(--primary) / 0.3)" />
                        </linearGradient>
                        <linearGradient id="lidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
                        </linearGradient>
                        <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="0%" y2="1">
                          <stop offset="0%" stopColor="#facc15" />
                          <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                        <filter id="boxShadow">
                          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="hsl(var(--primary) / 0.3)" />
                        </filter>
                      </defs>
                      {/* Box body */}
                      <rect x="20" y="90" width="140" height="100" rx="8" fill="url(#boxGrad)" filter="url(#boxShadow)" />
                      <rect x="20" y="90" width="140" height="100" rx="8" fill="url(#boxSide)" opacity="0.3" />
                      {/* Vertical ribbon */}
                      <rect x="80" y="90" width="20" height="100" fill="url(#ribbonGrad)" />
                      {/* Lid */}
                      <rect x="10" y="70" width="160" height="28" rx="6" fill="url(#lidGrad)" />
                      <rect x="10" y="70" width="160" height="28" rx="6" fill="rgba(255,255,255,0.1)" />
                      {/* Lid ribbon */}
                      <rect x="78" y="70" width="24" height="28" fill="url(#ribbonGrad)" />
                      {/* Bow */}
                      <ellipse cx="90" cy="62" rx="28" ry="18" fill="url(#ribbonGrad)" />
                      <ellipse cx="90" cy="62" rx="20" ry="12" fill="#fde047" opacity="0.6" />
                      <circle cx="90" cy="62" r="6" fill="#f59e0b" />
                      {/* Shine */}
                      <rect x="35" y="100" width="4" height="30" rx="2" fill="rgba(255,255,255,0.3)" />
                      <rect x="45" y="105" width="3" height="20" rx="1.5" fill="rgba(255,255,255,0.2)" />
                    </svg>
                  </motion.button>
                )}

                {/* Explosion particles */}
                {phase === "exploding" && (
                  <motion.div
                    className="absolute z-10"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.5, 2] }}
                    transition={{ duration: 0.8 }}
                  >
                    {[...Array(12)].map((_, i) => {
                      const angle = (i / 12) * Math.PI * 2;
                      return (
                        <motion.div
                          key={i}
                          className="absolute w-4 h-4 rounded-full"
                          style={{
                            background: ["#facc15", "#ef4444", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6"][i % 6],
                            left: 0,
                            top: 0,
                          }}
                          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                          animate={{
                            x: Math.cos(angle) * 120,
                            y: Math.sin(angle) * 120,
                            opacity: 0,
                            scale: 0,
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tap hint */}
              {phase === "idle" && (
                <motion.p
                  className="absolute -bottom-2 text-sm font-semibold text-primary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Toque para abrir! 👆
                </motion.p>
              )}
            </div>

            {/* Prizes list */}
            <Card className="w-full">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-semibold text-foreground mb-3">Prêmios possíveis:</p>
                <div className="grid grid-cols-2 gap-2">
                  {GIFTS.filter(g => g.days > 0).map((g, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      <span className="text-base">{g.emoji}</span>
                      <span className="text-xs text-muted-foreground">{g.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Result Modal */}
        <AnimatePresence>
          {phase === "revealed" && wonPrize && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={closeResult}
            >
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ type: "spring", damping: 18, stiffness: 200 }}
                className="bg-card rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-border relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {wonPrize.days > 0 && (
                  <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle, ${wonPrize.color}60, transparent 70%)` }} />
                )}
                <div className="relative z-10 space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="text-7xl">
                    {wonPrize.emoji}
                  </motion.div>
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
                      <p className="text-sm text-muted-foreground">Tente novamente na próxima semana!</p>
                    </>
                  )}
                  <Button onClick={closeResult} variant="outline" className="rounded-xl gap-2">
                    <X className="w-4 h-4" />Fechar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageLoader>
  );
};

export default WeeklyRedemption;
