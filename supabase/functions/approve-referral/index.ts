import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function applyReward(supabaseAdmin: any, referralId: string, userId: string) {
  // Add 30 days to subscription
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('subscription_ends_at, trial_ends_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) return false;

  const now = new Date();
  const currentSubEnd = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
  const currentTrialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;

  const activeBases = [currentSubEnd, currentTrialEnd].filter((d): d is Date => !!d && d > now);
  const baseDate = activeBases.length > 0
    ? new Date(Math.max(...activeBases.map(d => d.getTime())))
    : now;

  const newEnd = new Date(baseDate.getTime() + 30 * 86400000);

  await supabaseAdmin
    .from('profiles')
    .update({ subscription_ends_at: newEnd.toISOString() })
    .eq('user_id', userId);

  // Record reward
  await supabaseAdmin
    .from('referral_rewards')
    .insert({
      referral_id: referralId,
      user_id: userId,
      reward_type: 'subscription_days',
      days_added: 30,
    });

  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Validate admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return jsonResponse({ error: 'Não autenticado' }, 401);

    const { data: adminCheck } = await supabaseAdmin
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!adminCheck) return jsonResponse({ error: 'Acesso negado' }, 403);

    const { action, referral_id } = await req.json();

    // Get referral
    const { data: referral } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('id', referral_id)
      .single();

    if (!referral) return jsonResponse({ error: 'Indicação não encontrada' }, 404);

    if (action === 'approve') {
      if (referral.reward_applied) {
        return jsonResponse({ error: 'Recompensa já aplicada' }, 400);
      }

      // Apply rewards to both users
      const referrerOk = await applyReward(supabaseAdmin, referral_id, referral.referrer_user_id);
      let referredOk = false;
      if (referral.referred_user_id) {
        referredOk = await applyReward(supabaseAdmin, referral_id, referral.referred_user_id);
      }

      // Update referral
      await supabaseAdmin
        .from('referrals')
        .update({
          status: 'approved',
          reward_applied: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', referral_id);

      // Log
      await supabaseAdmin.from('system_logs').insert({
        user_id: user.id,
        event_type: 'referral_approved',
        description: `Indicação aprovada manualmente. Recompensa: referrer=${referrerOk}, referred=${referredOk}`,
        metadata: { referral_id, referrer: referral.referrer_user_id, referred: referral.referred_user_id },
      });

      return jsonResponse({ success: true, referrer_rewarded: referrerOk, referred_rewarded: referredOk });
    }

    if (action === 'reject') {
      await supabaseAdmin
        .from('referrals')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', referral_id);

      await supabaseAdmin.from('system_logs').insert({
        user_id: user.id,
        event_type: 'referral_rejected_manual',
        description: 'Indicação rejeitada manualmente pelo admin',
        metadata: { referral_id },
      });

      return jsonResponse({ success: true });
    }

    // Auto-approve: called when referred user confirms email + first login
    if (action === 'auto_check') {
      const { referred_user_id } = await req.json().catch(() => ({}));

      // Find pending referral for this user
      const { data: pendingReferral } = await supabaseAdmin
        .from('referrals')
        .select('*')
        .eq('referred_user_id', referred_user_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (!pendingReferral) return jsonResponse({ success: false, message: 'Nenhuma indicação pendente' });

      if (pendingReferral.fraud_score <= 40 && !pendingReferral.reward_applied) {
        // Auto approve
        const referrerOk = await applyReward(supabaseAdmin, pendingReferral.id, pendingReferral.referrer_user_id);
        let referredOk = false;
        if (pendingReferral.referred_user_id) {
          referredOk = await applyReward(supabaseAdmin, pendingReferral.id, pendingReferral.referred_user_id);
        }

        await supabaseAdmin
          .from('referrals')
          .update({ status: 'approved', reward_applied: true })
          .eq('id', pendingReferral.id);

        await supabaseAdmin.from('system_logs').insert({
          user_id: referred_user_id,
          event_type: 'referral_auto_approved',
          description: `Indicação aprovada automaticamente. Score: ${pendingReferral.fraud_score}`,
          metadata: { referral_id: pendingReferral.id },
        });

        return jsonResponse({ success: true, approved: true, referrer_rewarded: referrerOk, referred_rewarded: referredOk });
      }

      return jsonResponse({ success: false, message: 'Score muito alto para aprovação automática' });
    }

    return jsonResponse({ error: 'Ação inválida' }, 400);

  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro desconhecido' }, 500);
  }
});
