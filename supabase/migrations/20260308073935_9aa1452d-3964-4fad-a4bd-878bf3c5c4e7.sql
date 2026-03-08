
-- Update function to always generate a slug, using user_id as fallback
CREATE OR REPLACE FUNCTION public.generate_store_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate if slug is null
  IF NEW.store_slug IS NULL THEN
    IF NEW.store_name IS NOT NULL AND NEW.store_name != '' THEN
      base_slug := lower(trim(NEW.store_name));
      base_slug := translate(base_slug, 'àáâãäåèéêëìíîïòóôõöùúûüýñç', 'aaaaaaeeeeiiiioooooouuuuync');
      base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
      base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
    END IF;

    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'loja-' || substring(NEW.user_id::text from 1 for 8);
    END IF;

    final_slug := base_slug;

    WHILE EXISTS (SELECT 1 FROM public.store_settings WHERE store_slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;

    NEW.store_slug := final_slug;
  END IF;

  RETURN NEW;
END;
$$;

-- Update trigger to fire on INSERT or any UPDATE (not just store_name changes)
DROP TRIGGER IF EXISTS trigger_generate_store_slug ON public.store_settings;
CREATE TRIGGER trigger_generate_store_slug
  BEFORE INSERT OR UPDATE ON public.store_settings
  FOR EACH ROW
  WHEN (NEW.store_slug IS NULL)
  EXECUTE FUNCTION public.generate_store_slug();

-- Backfill all existing stores that don't have a slug
UPDATE public.store_settings SET store_slug = NULL WHERE store_slug IS NULL;
