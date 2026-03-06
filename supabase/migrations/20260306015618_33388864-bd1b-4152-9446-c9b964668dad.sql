INSERT INTO public.profiles (user_id, email, full_name, invite_code, trial_ends_at)
VALUES (
  '30f803c1-bf1c-464d-b6c1-76b8c9948f5e',
  'jardiel79162@gmail.com',
  'JTC Raposo',
  upper(substring(md5(random()::text) from 1 for 8)),
  now() + interval '3 days'
);

INSERT INTO public.invite_codes (code, owner_user_id, is_used)
SELECT p.invite_code, p.user_id, false
FROM public.profiles p
WHERE p.user_id = '30f803c1-bf1c-464d-b6c1-76b8c9948f5e';