-- CEO-only manual live-now notification
CREATE OR REPLACE FUNCTION public.notify_live_now()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_academy_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.academy_notifications (user_id, type, title, body, link_path)
  VALUES (
    NULL,
    'live_now',
    'Vault Trading Academy is Live Now.',
    '',
    '/academy/live'
  );
END;
$$;
