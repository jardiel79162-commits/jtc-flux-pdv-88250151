
-- Fix 1: Remove public read access to OTP codes
DROP POLICY IF EXISTS "Verifications are public read" ON public.email_verifications;

-- Fix 3: Remove self-assign role policy (privilege escalation)
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete own roles" ON public.user_roles;
