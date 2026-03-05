
-- Add is_blocked to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- System admins table
CREATE TABLE IF NOT EXISTS public.system_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;

-- Security definer function to check system admin
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = _user_id);
$$;

-- RLS for system_admins
CREATE POLICY "System admins can read admins table" ON public.system_admins
  FOR SELECT TO authenticated
  USING (public.is_system_admin(auth.uid()));

-- System settings global
CREATE TABLE IF NOT EXISTS public.system_settings_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode boolean DEFAULT false,
  maintenance_message text DEFAULT 'Sistema temporariamente em manutenção. Voltaremos em breve.',
  maintenance_image_url text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.system_settings_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read global settings" ON public.system_settings_global
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System admins can manage global settings" ON public.system_settings_global
  FOR ALL TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

INSERT INTO public.system_settings_global (maintenance_mode, maintenance_message)
VALUES (false, 'Sistema temporariamente em manutenção. Voltaremos em breve.');

-- System logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can read logs" ON public.system_logs
  FOR SELECT TO authenticated
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Authenticated can insert logs" ON public.system_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
