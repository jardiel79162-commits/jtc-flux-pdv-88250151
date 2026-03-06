
-- Table for admin-managed custom dashboard shortcuts
CREATE TABLE public.custom_shortcuts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_shortcuts ENABLE ROW LEVEL SECURITY;

-- Everyone can read active shortcuts
CREATE POLICY "Anyone can read active shortcuts"
  ON public.custom_shortcuts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only system admins can manage shortcuts
CREATE POLICY "Admins can manage shortcuts"
  ON public.custom_shortcuts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
