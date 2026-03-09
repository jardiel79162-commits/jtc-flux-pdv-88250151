
CREATE OR REPLACE FUNCTION public.check_cpf_available(p_cpf text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE cpf = p_cpf
  );
$$;

CREATE OR REPLACE FUNCTION public.check_email_available(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = lower(p_email)
  );
$$;

-- Grant access to anon and authenticated
GRANT EXECUTE ON FUNCTION public.check_cpf_available(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_available(text) TO anon, authenticated;
