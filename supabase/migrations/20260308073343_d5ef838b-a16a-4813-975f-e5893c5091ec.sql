
-- Add store_slug column
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS store_slug text UNIQUE;

-- Create function to generate slug from store_name
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
  -- Only generate if slug is null and store_name is not empty
  IF NEW.store_slug IS NULL AND NEW.store_name IS NOT NULL AND NEW.store_name != '' THEN
    -- Normalize: lowercase, replace spaces/special chars with hyphens, remove accents
    base_slug := lower(trim(NEW.store_name));
    base_slug := translate(base_slug, 'àáâãäåèéêëìíîïòóôõöùúûüýñç', 'aaaaaaeeeeiiiioooooouuuuync');
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
    
    IF base_slug = '' THEN
      base_slug := 'loja';
    END IF;
    
    final_slug := base_slug;
    
    -- Check uniqueness
    WHILE EXISTS (SELECT 1 FROM public.store_settings WHERE store_slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.store_slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_generate_store_slug ON public.store_settings;
CREATE TRIGGER trigger_generate_store_slug
  BEFORE INSERT OR UPDATE OF store_name ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_store_slug();

-- Generate slugs for existing stores
UPDATE public.store_settings SET store_slug = NULL WHERE store_slug IS NULL;
