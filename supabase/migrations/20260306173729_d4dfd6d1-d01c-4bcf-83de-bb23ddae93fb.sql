
-- Drop ALL existing policies on custom_shortcuts
DROP POLICY IF EXISTS "Admins can manage shortcuts" ON public.custom_shortcuts;
DROP POLICY IF EXISTS "Anyone can read active shortcuts" ON public.custom_shortcuts;

-- Create PERMISSIVE policies (default behavior)
CREATE POLICY "Admins can manage shortcuts"
ON public.custom_shortcuts
FOR ALL
TO authenticated
USING (public.is_system_admin(auth.uid()))
WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "Anyone can read active shortcuts"
ON public.custom_shortcuts
FOR SELECT
TO authenticated
USING (is_active = true);
