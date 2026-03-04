
-- Recreate email_logs with correct columns
DROP TABLE IF EXISTS public.email_logs;
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_email TEXT,
  sender_email TEXT,
  recipient_email TEXT,
  subject TEXT,
  document_type TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own email logs" ON public.email_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Fix create_weekly_code_for_user to generate code internally
CREATE OR REPLACE FUNCTION public.create_weekly_code_for_user(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_week_start DATE;
BEGIN
  -- Calculate week start (Monday)
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  v_code := upper(substring(md5(random()::text || p_user_id::text) from 1 for 8));
  
  -- Check if code already exists for this week
  IF EXISTS (SELECT 1 FROM public.weekly_redemption_codes WHERE user_id = p_user_id AND week_start = v_week_start) THEN
    SELECT code INTO v_code FROM public.weekly_redemption_codes WHERE user_id = p_user_id AND week_start = v_week_start LIMIT 1;
    RETURN v_code;
  END IF;

  INSERT INTO public.weekly_redemption_codes (user_id, code, week_start)
  VALUES (p_user_id, v_code, v_week_start);
  
  RETURN v_code;
END;
$$;

NOTIFY pgrst, 'reload schema';
