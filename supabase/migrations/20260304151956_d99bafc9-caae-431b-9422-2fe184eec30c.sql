
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_invite_code TEXT;
BEGIN
  new_invite_code := upper(substring(md5(random()::text) from 1 for 8));
  
  INSERT INTO public.profiles (user_id, email, full_name, cpf, phone, cep, street, number, neighborhood, city, state, invite_code, referred_by_code)
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
    NEW.raw_user_meta_data->>'referred_by_code'
  );

  INSERT INTO public.invite_codes (code, owner_user_id, is_used)
  VALUES (new_invite_code, NEW.id, false);
  
  RETURN NEW;
END;
$function$;

INSERT INTO public.invite_codes (code, owner_user_id, is_used)
SELECT p.invite_code, p.user_id, false
FROM public.profiles p
WHERE p.invite_code IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.invite_codes ic WHERE ic.code = p.invite_code
  );
