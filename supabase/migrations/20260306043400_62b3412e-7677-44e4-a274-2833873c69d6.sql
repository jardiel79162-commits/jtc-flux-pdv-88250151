
-- Fix the insert policy to be service-role only (drop the permissive one)
DROP POLICY "Service can insert spins" ON public.prize_wheel_spins;

-- Only service role can insert (no authenticated insert)
CREATE POLICY "Service can insert spins"
  ON public.prize_wheel_spins
  FOR INSERT
  TO service_role
  WITH CHECK (true);
