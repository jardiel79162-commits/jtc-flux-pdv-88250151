
-- Add gender column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text NULL;

-- Create phone availability check function
CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = p_phone
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_phone_available(text) TO anon, authenticated;

-- Update handle_new_user to save gender
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_invite_code TEXT;
  v_trial_ends_at TIMESTAMPTZ;
BEGIN
  new_invite_code := upper(substring(md5(random()::text) from 1 for 8));
  v_trial_ends_at := now() + interval '3 days';
  
  INSERT INTO public.profiles (user_id, email, full_name, cpf, phone, cep, street, number, neighborhood, city, state, invite_code, referred_by_code, trial_ends_at, gender)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cep',
    NEW.raw_user_meta_data->>'street',
    NEW.raw_user_meta_data->>'number',
    NEW.raw_user_meta_data->>'neighborhood',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state',
    new_invite_code,
    NEW.raw_user_meta_data->>'referred_by_code',
    v_trial_ends_at,
    NEW.raw_user_meta_data->>'gender'
  );

  INSERT INTO public.invite_codes (code, owner_user_id, is_used)
  VALUES (new_invite_code, NEW.id, false);
  
  RETURN NEW;
END;
$function$;
