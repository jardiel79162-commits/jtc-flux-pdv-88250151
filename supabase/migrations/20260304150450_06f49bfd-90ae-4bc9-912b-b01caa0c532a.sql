
-- Add title column to auri_conversations
ALTER TABLE public.auri_conversations ADD COLUMN title TEXT;

-- Email logs table
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own email logs" ON public.email_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Purchase items table
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  purchase_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own purchase items" ON public.purchase_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Store integrations table
CREATE TABLE public.store_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_type TEXT NOT NULL,
  encrypted_token TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own integrations" ON public.store_integrations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RPC functions for weekly redemption
CREATE OR REPLACE FUNCTION public.create_weekly_code_for_user(p_user_id UUID, p_code TEXT, p_week_start DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.weekly_redemption_codes (user_id, code, week_start)
  VALUES (p_user_id, p_code, p_week_start)
  ON CONFLICT DO NOTHING;
  RETURN p_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_weekly_code(p_user_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record FROM public.weekly_redemption_codes
  WHERE user_id = p_user_id AND code = p_code AND is_used = false
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou já utilizado');
  END IF;

  UPDATE public.weekly_redemption_codes
  SET is_used = true, benefit_type = 'days', days_added = 1
  WHERE id = v_record.id;

  RETURN jsonb_build_object('success', true, 'benefit_type', 'days', 'days_added', 1);
END;
$$;

NOTIFY pgrst, 'reload schema';
