-- 1) CRÍTICO: Proteger email_verifications - OTPs expostos
CREATE POLICY "Only service role can manage verifications"
ON public.email_verifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2) Restringir blocked_cpfs apenas para authenticated
DROP POLICY IF EXISTS "Service can read blocked cpfs" ON public.blocked_cpfs;
CREATE POLICY "Authenticated can read blocked cpfs"
ON public.blocked_cpfs
FOR SELECT
TO authenticated
USING (true);

-- 3) Restringir invite_ip_usage apenas para authenticated
DROP POLICY IF EXISTS "IP usage is public read" ON public.invite_ip_usage;
CREATE POLICY "Authenticated can read ip usage"
ON public.invite_ip_usage
FOR SELECT
TO authenticated
USING (true);

-- 4) Restringir invite_codes - não expor para anon
DROP POLICY IF EXISTS "Anyone can read invite codes" ON public.invite_codes;
CREATE POLICY "Authenticated can read invite codes"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (true);

-- 5) CRÍTICO: referral_rewards - qualquer user pode inserir rewards
DROP POLICY IF EXISTS "Service can insert rewards" ON public.referral_rewards;
CREATE POLICY "Only service role can insert rewards"
ON public.referral_rewards
FOR INSERT
TO service_role
WITH CHECK (true);

-- 6) CRÍTICO: referrals - qualquer user pode inserir referrals
DROP POLICY IF EXISTS "Service can insert referrals" ON public.referrals;
CREATE POLICY "Only service role can insert referrals"
ON public.referrals
FOR INSERT
TO service_role
WITH CHECK (true);

-- 7) CRÍTICO: prize_wheel_spins - users podem alterar prize_label/prize_days
DROP POLICY IF EXISTS "Users can update own spins" ON public.prize_wheel_spins;
CREATE POLICY "Users can mark own spins as used"
ON public.prize_wheel_spins
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Restringir INSERT apenas para service_role
DROP POLICY IF EXISTS "Service can insert spins" ON public.prize_wheel_spins;
CREATE POLICY "Only service role can insert spins"
ON public.prize_wheel_spins
FOR INSERT
TO service_role
WITH CHECK (true);

-- 8) system_logs - prevenir log poisoning
DROP POLICY IF EXISTS "Authenticated can insert logs" ON public.system_logs;
CREATE POLICY "Users can insert own logs"
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());