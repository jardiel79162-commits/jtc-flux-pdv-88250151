
-- Tabela de referrals (indicações) com dados antifraude
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid,
  referral_code text NOT NULL,
  ip_address text,
  device_fingerprint text,
  user_agent text,
  status text NOT NULL DEFAULT 'pending',
  fraud_score integer NOT NULL DEFAULT 0,
  fraud_reasons jsonb DEFAULT '[]'::jsonb,
  reward_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

-- Tabela de recompensas de indicação
CREATE TABLE public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid REFERENCES public.referrals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  reward_type text NOT NULL DEFAULT 'subscription_days',
  days_added integer NOT NULL DEFAULT 30,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance de consultas antifraude
CREATE INDEX idx_referrals_ip ON public.referrals(ip_address);
CREATE INDEX idx_referrals_fingerprint ON public.referrals(device_fingerprint);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_created ON public.referrals(created_at);

-- RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias indicações (como referrer ou referred)
CREATE POLICY "Users can read own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

-- Sistema admins podem ver todas
CREATE POLICY "Admins can read all referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (is_system_admin(auth.uid()));

-- Admins podem atualizar (aprovar/rejeitar)
CREATE POLICY "Admins can update referrals" ON public.referrals
  FOR UPDATE TO authenticated
  USING (is_system_admin(auth.uid()));

-- Insert via service role (edge function)
CREATE POLICY "Service can insert referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Rewards: users can read own
CREATE POLICY "Users can read own rewards" ON public.referral_rewards
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all rewards
CREATE POLICY "Admins can read all rewards" ON public.referral_rewards
  FOR SELECT TO authenticated
  USING (is_system_admin(auth.uid()));

-- Service can insert rewards
CREATE POLICY "Service can insert rewards" ON public.referral_rewards
  FOR INSERT TO authenticated
  WITH CHECK (true);
