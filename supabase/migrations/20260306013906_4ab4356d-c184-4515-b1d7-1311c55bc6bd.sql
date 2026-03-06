
-- Allow system admins to read all profiles
CREATE POLICY "System admins can read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_system_admin(auth.uid()));

-- Allow system admins to read all store_settings
CREATE POLICY "System admins can read all store settings"
ON public.store_settings FOR SELECT
TO authenticated
USING (is_system_admin(auth.uid()));
