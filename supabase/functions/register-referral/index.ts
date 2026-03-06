import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Domínios de e-mail temporário/descartável conhecidos
const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', 'mailinator.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'trashmail.com', 'fakeinbox.com', 'mailnesia.com',
  'maildrop.cc', 'discard.email', 'temp-mail.org', 'getnada.com',
  'mohmal.com', 'emailondeck.com', 'tempail.com', 'burnermail.io',
  '10minutemail.com', 'minutemail.com', 'tempr.email', 'crazymailing.com',
];

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
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

    const {
      referral_code,
      referred_user_id,
      referred_email,
      device_fingerprint,
      user_agent,
    } = await req.json();

    // Get client IP
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    console.log(`Registering referral: code=${referral_code}, IP=${clientIP}, fingerprint=${device_fingerprint}`);

    // 1. Find the referrer by invite code
    const { data: inviteCode } = await supabaseAdmin
      .from('invite_codes')
      .select('owner_user_id, is_used')
      .eq('code', referral_code.toUpperCase())
      .maybeSingle();

    if (!inviteCode || !inviteCode.owner_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código de convite inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referrerUserId = inviteCode.owner_user_id;

    // 2. Calculate fraud score
    let fraudScore = 0;
    const fraudReasons: string[] = [];

    // Rule 1: Same IP created >2 accounts in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: ipCount24h } = await supabaseAdmin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .gte('created_at', oneDayAgo);

    if ((ipCount24h || 0) >= 2) {
      fraudScore += 40;
      fraudReasons.push(`IP ${clientIP} criou ${(ipCount24h || 0) + 1} contas em 24h`);
    }

    // Rule 2: Same device fingerprint on multiple accounts
    if (device_fingerprint) {
      const { count: fpCount } = await supabaseAdmin
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('device_fingerprint', device_fingerprint);

      if ((fpCount || 0) >= 1) {
        fraudScore += 40;
        fraudReasons.push(`Fingerprint duplicado em ${(fpCount || 0) + 1} contas`);
      }
    }

    // Rule 3: Account created <2 min after another from same IP
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { count: recentIpCount } = await supabaseAdmin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .gte('created_at', twoMinAgo);

    if ((recentIpCount || 0) >= 1) {
      fraudScore += 20;
      fraudReasons.push('Cadastro em menos de 2 minutos após outro do mesmo IP');
    }

    // Rule 4: Disposable email
    if (referred_email && isDisposableEmail(referred_email)) {
      fraudScore += 30;
      fraudReasons.push('E-mail temporário/descartável detectado');
    }

    // Rule 5: IP limit - max 3 signups per IP in 24h
    const { count: totalIpSignups } = await supabaseAdmin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .gte('created_at', oneDayAgo);

    const ipBlocked = (totalIpSignups || 0) >= 3;
    if (ipBlocked) {
      fraudReasons.push(`IP bloqueado: ${(totalIpSignups || 0) + 1} cadastros em 24h (limite: 3)`);
    }

    // Determine status based on fraud score
    let status: string;
    if (ipBlocked) {
      status = 'under_review';
    } else if (fraudScore >= 71) {
      status = 'rejected';
    } else if (fraudScore >= 41) {
      status = 'under_review';
    } else {
      status = 'pending'; // Will be approved after email confirmation + first login
    }

    // 3. Insert referral record
    const { data: referral, error: insertError } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_user_id: referrerUserId,
        referred_user_id: referred_user_id || null,
        referral_code: referral_code.toUpperCase(),
        ip_address: clientIP,
        device_fingerprint: device_fingerprint || null,
        user_agent: user_agent || null,
        status,
        fraud_score: fraudScore,
        fraud_reasons: fraudReasons,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting referral:', insertError);
      throw insertError;
    }

    // 4. Log security event
    const logEvent = status === 'rejected' ? 'referral_rejected' :
                     status === 'under_review' ? 'referral_under_review' :
                     'referral_registered';

    await supabaseAdmin.from('system_logs').insert({
      user_id: referred_user_id || null,
      event_type: logEvent,
      description: `Indicação ${status}: score=${fraudScore}`,
      metadata: {
        referral_id: referral.id,
        referrer_user_id: referrerUserId,
        ip_address: clientIP,
        fraud_score: fraudScore,
        fraud_reasons: fraudReasons,
        status,
      },
    });

    // 5. If score is low and status is pending, auto-approve (reward after first login)
    // For now, just return the result
    console.log(`Referral created: id=${referral.id}, status=${status}, score=${fraudScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        referral_id: referral.id,
        status,
        fraud_score: fraudScore,
        blocked: ipBlocked,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
