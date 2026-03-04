ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS days_to_add integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mercado_pago_payment_id text,
  ADD COLUMN IF NOT EXISTS mercado_pago_qr_code text,
  ADD COLUMN IF NOT EXISTS mercado_pago_qr_code_base64 text,
  ADD COLUMN IF NOT EXISTS mercado_pago_pix_copy_paste text,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_mp_payment_id ON public.subscription_payments(mercado_pago_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(status);