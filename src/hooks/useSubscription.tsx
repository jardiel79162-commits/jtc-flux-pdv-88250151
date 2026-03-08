import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  isTrial: boolean;
  daysLeft: number;
  planType: string | null;
  subscriptionEndsAt: string | null;
}

export const useSubscription = () => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isActive: true,
    isExpired: false,
    isTrial: false,
    daysLeft: 0,
    planType: null,
    subscriptionEndsAt: null,
  });
  const [loading, setLoading] = useState(true);

  const { isEmployee, adminId } = usePermissions();

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      // Employees use their admin's subscription
      const targetUserId = isEmployee && adminId ? adminId : user.id;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("created_at, subscription_ends_at, trial_ends_at")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao verificar assinatura:", error);
        setLoading(false);
        return;
      }

      const now = new Date();

      // 1) Check active subscription (set by admin or payment)
      if (profile?.subscription_ends_at) {
        const subEnd = new Date(profile.subscription_ends_at);
        if (subEnd > now) {
          const daysLeft = Math.max(0, Math.ceil((subEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          setStatus({
            isActive: true,
            isExpired: false,
            isTrial: false,
            daysLeft,
            planType: "paid",
            subscriptionEndsAt: profile.subscription_ends_at,
          });
          setLoading(false);
          return;
        }
      }

      // 2) Check trial period
      // Use trial_ends_at if set, otherwise fallback to created_at + 3 days
      const trialEnd = profile?.trial_ends_at
        ? new Date(profile.trial_ends_at)
        : new Date((profile?.created_at ? new Date(profile.created_at) : new Date()).getTime() + 3 * 24 * 60 * 60 * 1000);

      if (trialEnd > now) {
        const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        setStatus({
          isActive: true,
          isExpired: false,
          isTrial: true,
          daysLeft,
          planType: "trial",
          subscriptionEndsAt: null,
        });
        setLoading(false);
        return;
      }

      // 3) Expired
      setStatus({
        isActive: false,
        isExpired: true,
        isTrial: false,
        daysLeft: 0,
        planType: null,
        subscriptionEndsAt: profile?.subscription_ends_at || null,
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Erro ao verificar assinatura:", error);
      setLoading(false);
    }
  }, [isEmployee, adminId]);

  useEffect(() => {
    checkSubscription();

    // Listen for realtime profile changes (extend subscription, etc.)
    let channel: any;
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const targetId = isEmployee && adminId ? adminId : session.user.id;
      channel = supabase
        .channel('subscription-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${targetId}`,
          },
          () => {
            checkSubscription();
          }
        )
        .subscribe();
    };
    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [checkSubscription]);

  return { ...status, loading, refresh: checkSubscription };
};
