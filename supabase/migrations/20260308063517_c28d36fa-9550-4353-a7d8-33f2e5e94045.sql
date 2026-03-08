-- 1) blocked_cpfs: restringir para system admins apenas
DROP POLICY IF EXISTS "Authenticated can read blocked cpfs" ON public.blocked_cpfs;
CREATE POLICY "System admins can read blocked cpfs"
ON public.blocked_cpfs
FOR SELECT
TO authenticated
USING (is_system_admin(auth.uid()));

-- 2) invite_ip_usage: restringir para system admins apenas
DROP POLICY IF EXISTS "Authenticated can read ip usage" ON public.invite_ip_usage;
CREATE POLICY "System admins can read ip usage"
ON public.invite_ip_usage
FOR SELECT
TO authenticated
USING (is_system_admin(auth.uid()));

-- 3) invite_codes: restringir para dono ou admin
DROP POLICY IF EXISTS "Authenticated can read invite codes" ON public.invite_codes;
CREATE POLICY "Users can read own invite codes"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid() OR is_system_admin(auth.uid()));

-- 4) admin_messages: restringir sender_type com CHECK constraint
ALTER TABLE public.admin_messages DROP CONSTRAINT IF EXISTS admin_messages_sender_type_check;
ALTER TABLE public.admin_messages ADD CONSTRAINT admin_messages_sender_type_check
CHECK (sender_type IN ('user', 'admin', 'system'));