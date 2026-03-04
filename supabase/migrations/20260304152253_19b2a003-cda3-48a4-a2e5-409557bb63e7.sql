
CREATE POLICY "Users can insert own invite codes"
ON public.invite_codes
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());
