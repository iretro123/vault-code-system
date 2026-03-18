-- Manual live toggle with auto-expire
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS is_manual_live boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.start_live_now()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  template record;
BEGIN
  IF NOT public.is_academy_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id INTO existing_id
  FROM public.live_sessions
  WHERE status = 'live'
    AND is_manual_live = true
  ORDER BY session_date DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  SELECT title, description, join_url, duration_minutes
  INTO template
  FROM public.live_sessions
  WHERE session_type = 'live'
    AND join_url <> ''
  ORDER BY session_date DESC
  LIMIT 1;

  IF template.join_url IS NULL OR template.join_url = '' THEN
    RAISE EXCEPTION 'No live session with join URL found';
  END IF;

  INSERT INTO public.live_sessions (
    title,
    description,
    session_date,
    join_url,
    session_type,
    duration_minutes,
    status,
    is_replay,
    replay_url,
    created_by,
    is_manual_live
  ) VALUES (
    COALESCE(template.title, 'Live Trading Room'),
    COALESCE(template.description, ''),
    now(),
    template.join_url,
    'live',
    COALESCE(template.duration_minutes, 120),
    'live',
    false,
    NULL,
    auth.uid(),
    true
  ) RETURNING id INTO existing_id;

  RETURN existing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.stop_live_now()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_academy_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.live_sessions
  SET status = 'completed'
  WHERE status = 'live'
    AND is_manual_live = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_live_now()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_sessions
  SET status = 'completed'
  WHERE status = 'live'
    AND is_manual_live = true
    AND session_date < now() - interval '2 hours';
END;
$$;

SELECT cron.schedule(
  'cleanup-live-now',
  '*/5 * * * *',
  'SELECT public.cleanup_live_now()'
);
