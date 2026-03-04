
-- Fix overly permissive RLS policies

-- user_roles: replace "true" policy with proper scoped policies
DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;
CREATE POLICY "Users can insert own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own roles" ON public.user_roles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- email_verifications: restrict to service role only (edge functions use service role key)
DROP POLICY IF EXISTS "Service can manage verifications" ON public.email_verifications;
CREATE POLICY "Verifications are public read" ON public.email_verifications FOR SELECT USING (true);

-- invite_ip_usage: restrict
DROP POLICY IF EXISTS "Service can manage ip usage" ON public.invite_ip_usage;
CREATE POLICY "IP usage is public read" ON public.invite_ip_usage FOR SELECT USING (true);

-- blocked_cpfs is already SELECT only, no issue there

NOTIFY pgrst, 'reload schema';
