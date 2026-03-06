
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage shortcuts" ON public.custom_shortcuts;
DROP POLICY IF EXISTS "Anyone can read active shortcuts" ON public.custom_shortcuts;

-- Create permissive policies instead
CREATE POLICY "Admins can manage shortcuts"
ON public.custom_shortcuts
FOR ALL
TO authenticated
USING (is_system_admin(auth.uid()))
WITH CHECK (is_system_admin(auth.uid()));

CREATE POLICY "Anyone can read active shortcuts"
ON public.custom_shortcuts
FOR SELECT
TO authenticated
USING (is_active = true);
