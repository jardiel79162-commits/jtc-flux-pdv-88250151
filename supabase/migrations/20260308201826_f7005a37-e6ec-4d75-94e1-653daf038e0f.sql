
-- Allow admin to read profiles of their employees
CREATE POLICY "Admin can read employee profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = profiles.user_id
      AND e.admin_id = auth.uid()
  )
);
