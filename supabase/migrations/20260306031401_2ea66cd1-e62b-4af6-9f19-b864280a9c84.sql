
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS terms_version text DEFAULT NULL;
