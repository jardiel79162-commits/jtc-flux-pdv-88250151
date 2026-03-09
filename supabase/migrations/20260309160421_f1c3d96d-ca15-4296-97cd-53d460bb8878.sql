
CREATE OR REPLACE FUNCTION public.open_weekly_gift(p_user_id uuid, p_prize_label text, p_days_added integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_code TEXT;
  v_existing RECORD;
BEGIN
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  
  -- Check if already opened this week
  SELECT * INTO v_existing FROM public.weekly_redemption_codes
  WHERE user_id = p_user_id AND week_start = v_week_start AND is_used = true
  LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já abriu o presente desta semana');
  END IF;
  
  v_code := upper(substring(md5(random()::text || p_user_id::text) from 1 for 8));
  
  -- Delete any unused code for this week
  DELETE FROM public.weekly_redemption_codes WHERE user_id = p_user_id AND week_start = v_week_start AND is_used = false;
  
  -- Insert used code with prize
  INSERT INTO public.weekly_redemption_codes (user_id, code, week_start, is_used, benefit_type, days_added)
  VALUES (p_user_id, v_code, v_week_start, true, p_prize_label, p_days_added);
  
  -- Apply days to subscription if won
  IF p_days_added > 0 THEN
    UPDATE public.profiles
    SET subscription_ends_at = GREATEST(
      COALESCE(subscription_ends_at, COALESCE(trial_ends_at, now())),
      now()
    ) + (p_days_added || ' days')::interval
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'prize_label', p_prize_label, 'days_added', p_days_added);
END;
$$;
