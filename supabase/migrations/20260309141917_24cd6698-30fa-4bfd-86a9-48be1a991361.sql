
ALTER TABLE public.system_settings_global
ADD COLUMN IF NOT EXISTS redemption_event_day integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS redemption_event_hour integer DEFAULT 16,
ADD COLUMN IF NOT EXISTS redemption_event_duration integer DEFAULT 60;
