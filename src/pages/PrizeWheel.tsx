import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Trophy, X, Loader2, Share2, Copy, Check, Users, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { WheelSVG, PRIZES, SLICE_DEG } from "@/components/prize-wheel/WheelSVG";
import { CenterButton } from "@/components/prize-wheel/CenterButton";
import { Pointer } from "@/components/prize-wheel/Pointer";
import { LEDs } from "@/components/prize-wheel/LEDs";

function pickPrize(): number {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < PRIZES.length; i++) {
    r -= PRIZES[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

const PrizeWheel = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<typeof PRIZES[0] | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableSpins, setAvailableSpins] = useState(0);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState({ total: 0, activated: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load invite code
      const { data: profile } = await supabase
        .from("profiles")
        .select("invite_code")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profile?.invite_code) setInviteCode(profile.invite_code);

      // Load available spins
      const { data: spins, error: spinsError } = await supabase
        .from("prize_wheel_spins" as any)
        .select("id")
        .eq("user_id", session.user.id)
        .eq("is_used", false);
      if (!spinsError && spins) setAvailableSpins(spins.length);

      // Load referral stats
      const { data: referrals } = await supabase
        .from("referrals")
        .select("id, status, reward_applied")
        .eq("referrer_user_id", session.user.id);
      if (referrals) {
        setReferralStats({
          total: referrals.length,
          activated: referrals.filter(r => r.reward_applied).length,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: auto-update when admin grants spins
  useEffect(() => {
    let channel: any;
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      channel = supabase
        .channel('prize-wheel-spins')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'prize_wheel_spins',
            filter: `user_id=eq.${session.user.id}`,
          },
          () => {
            loadData();
            toast({ title: "🎉 Nova rodada!", description: "Você recebeu uma rodada grátis na roleta!" });
          }
        )
        .subscribe();
    };
    setupRealtime();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [loadData]);

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/auth?invite=${inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link copiado!", description: "Compartilhe com seus amigos." });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInvite = async () => {
    const link = `${window.location.origin}/auth?invite=${inviteCode}`;
    if (navigator.share) {
      await navigator.share({
        title: "JTC Flux PDV",
        text: `Use meu código de convite ${inviteCode} e ganhe 1 mês + 3 dias grátis!`,
        url: link,
      });
    } else {
      copyInviteLink();
    }
  };

  const spin = async () => {
    if (isSpinning || availableSpins <= 0) return;
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

    setTimeout(async () => {
      setIsSpinning(false);
      setWonPrize(prize);
      setShowResult(true);

      // Mark a spin as used
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: unusedSpins } = await supabase
          .from("prize_wheel_spins" as any)
          .select("id")
          .eq("user_id", session.user.id)
          .eq("is_used", false)
          .limit(1);

        if (unusedSpins && unusedSpins.length > 0) {
          await supabase
            .from("prize_wheel_spins" as any)
            .update({
              is_used: true,
              used_at: new Date().toISOString(),
              prize_label: prize.label,
              prize_days: prize.days,
            } as any)
            .eq("id", (unusedSpins[0] as any).id);
        }

        setAvailableSpins((prev) => Math.max(0, prev - 1));
        if (prize.days > 0) await applyPrize(prize.days);
      } catch (e) {
        console.error("Erro ao usar rodada:", e);
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
      const cur = profile.subscription_ends_at
        ? new Date(profile.subscription_ends_at)
        : profile.trial_ends_at
        ? new Date(profile.trial_ends_at)
        : now;
      const base = cur > now ? cur : now;
      const newEnd = new Date(base.getTime() + days * 86400000);
      await supabase
        .from("profiles")
        .update({ subscription_ends_at: newEnd.toISOString() })
        .eq("user_id", session.user.id);
    } catch (e) {
      console.error("Erro ao aplicar prêmio:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-8">
      <style>{`@keyframes spin-rainbow { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }`}</style>

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold">
          <Gift className="w-4 h-4" />Roleta de Prêmios
        </div>
        <h1 className="text-2xl font-bold text-foreground">Gire e Ganhe!</h1>
        <p className="text-sm text-muted-foreground">
          Convide amigos e ganhe rodadas grátis na roleta
        </p>
      </div>

      {/* Invite Card */}
      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Convide e Ganhe</h3>
              <p className="text-xs text-muted-foreground">
                Quando seu convidado <strong>ativar um plano pago</strong>, você ganha uma rodada!
              </p>
            </div>
          </div>

          {inviteCode && (
            <div className="flex gap-2">
              <Button onClick={copyInviteLink} variant="outline" className="flex-1 gap-2 rounded-xl">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado!" : inviteCode}
              </Button>
              <Button onClick={shareInvite} className="gap-2 rounded-xl">
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-lg font-bold text-foreground">{referralStats.total}</span>
              </div>
              <span className="text-xs text-muted-foreground">Convidados</span>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Ticket className="w-4 h-4 text-primary" />
                <span className="text-lg font-bold text-primary">{availableSpins}</span>
              </div>
              <span className="text-xs text-muted-foreground">Rodadas Disponíveis</span>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Como funciona:</p>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                1️⃣ Compartilhe seu código de convite
              </p>
              <p className="text-xs text-muted-foreground">
                2️⃣ Seu amigo cria a conta → <strong>você ganha 1 mês + 3 dias</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                3️⃣ Seu amigo ativa um plano pago → <strong>você ganha 1 rodada grátis</strong> 🎰
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ THE WHEEL ═══ */}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: 372, height: 396 }}>
          <LEDs active={isSpinning} />
          <Pointer active={isSpinning} />

          <div className="absolute" style={{ left: 16, top: 24, width: 340, height: 340 }}>
            <motion.div
              style={{ width: 340, height: 340 }}
              animate={{ rotate: rotation }}
              transition={{ duration: 5.5, ease: [0.12, 0.84, 0.18, 1] }}
            >
              <WheelSVG />
            </motion.div>
          </div>

          <div className="absolute" style={{ left: 16, top: 24, width: 340, height: 340 }}>
            <CenterButton onClick={spin} disabled={isSpinning || availableSpins <= 0} />
          </div>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[280px] h-4 rounded-[50%] bg-black/15 blur-md" />
        </div>

        {availableSpins <= 0 && !isSpinning && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground text-center mt-2"
          >
            Convide amigos para ganhar rodadas! ☝️
          </motion.p>
        )}
      </div>

      {/* Result Modal */}
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
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: "spring", damping: 18, stiffness: 200 }}
              className="bg-card rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-border relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {wonPrize.days > 0 && (
                <div
                  className="absolute inset-0 opacity-5"
                  style={{ background: `radial-gradient(circle, ${wonPrize.color}40, transparent 70%)` }}
                />
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
                    <p className="text-sm text-muted-foreground">Tente novamente! Convide mais amigos.</p>
                  </>
                )}
                <Button onClick={() => setShowResult(false)} variant="outline" className="rounded-xl gap-2">
                  <X className="w-4 h-4" />Fechar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrizeWheel;
