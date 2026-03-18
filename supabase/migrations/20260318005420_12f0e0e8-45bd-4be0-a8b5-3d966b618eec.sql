
SELECT cron.unschedule('cleanup-live-now');

DROP FUNCTION IF EXISTS public.cleanup_live_now();

CREATE OR REPLACE FUNCTION public.start_live_now()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_id uuid;
  template record;
  fire_at timestamptz;
  cron_expr text;
  job_name text;
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
    title, description, session_date, join_url, session_type,
    duration_minutes, status, is_replay, replay_url, created_by, is_manual_live
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

  fire_at := now() + interval '2 hours';
  cron_expr := date_part('minute', fire_at)::int || ' ' ||
               date_part('hour', fire_at)::int   || ' ' ||
               date_part('day', fire_at)::int     || ' ' ||
               date_part('month', fire_at)::int   || ' *';
  job_name := 'cleanup-live-' || existing_id::text;

  PERFORM cron.schedule(
    job_name,
    cron_expr,
    format(
      $$UPDATE public.live_sessions SET status = 'completed' WHERE id = %L AND status = 'live'; SELECT cron.unschedule(%L);$$,
      existing_id, job_name
    )
  );

  RETURN existing_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stop_live_now()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_rec record;
  job_name text;
BEGIN
  IF NOT public.is_academy_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR session_rec IN
    SELECT id FROM public.live_sessions
    WHERE status = 'live' AND is_manual_live = true
  LOOP
    job_name := 'cleanup-live-' || session_rec.id::text;
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  UPDATE public.live_sessions
  SET status = 'completed'
  WHERE status = 'live'
    AND is_manual_live = true;
END;
$function$;
