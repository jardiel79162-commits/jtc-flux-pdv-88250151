
-- Table to track prize wheel spins earned by referrals
CREATE TABLE public.prize_wheel_spins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE CASCADE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  prize_label TEXT,
  prize_days INTEGER,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prize_wheel_spins ENABLE ROW LEVEL SECURITY;

-- Users can read their own spins
CREATE POLICY "Users can read own spins"
  ON public.prize_wheel_spins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own spins (to mark as used)
CREATE POLICY "Users can update own spins"
  ON public.prize_wheel_spins
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role inserts spins (via webhook/edge function)
CREATE POLICY "Service can insert spins"
  ON public.prize_wheel_spins
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
