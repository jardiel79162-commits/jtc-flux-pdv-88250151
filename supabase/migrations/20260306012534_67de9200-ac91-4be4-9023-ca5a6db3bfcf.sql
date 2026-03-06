
-- Table for admin-user messages
CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'user')),
  content text,
  image_url text,
  is_read boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own messages
CREATE POLICY "Users can read own messages"
  ON public.admin_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- Users can insert messages (as 'user' sender)
CREATE POLICY "Users can send messages"
  ON public.admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND sender_type = 'user')
    OR is_system_admin(auth.uid())
  );

-- Users can update own messages (mark as read)
CREATE POLICY "Users can mark own as read"
  ON public.admin_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
