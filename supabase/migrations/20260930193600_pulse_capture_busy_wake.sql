-- Deploy the busy-aware capture Worker before this migration.
CREATE OR REPLACE FUNCTION public.pulse_spy_capture_claim(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  cfg public.pulse_spy_config%ROWTYPE; job record; ticket uuid:=gen_random_uuid();
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id FOR UPDATE;
  IF NOT cfg.capture_enabled THEN RETURN NULL; END IF;
  IF cfg.capture_lease_until>now() THEN RETURN jsonb_build_object('busy',true); END IF;
  -- Hard expiry also recovers work abandoned by a killed Worker.
  WITH expired AS (
    UPDATE public.pulse_spy_captures c SET state='unavailable',failure='capture-window-expired'
      FROM public.pulse_spy_events e WHERE c.event_id=e.id AND c.state IN('queued','running')
        AND (e.at<extract(epoch FROM now())*1000-90000 OR c.attempts>=2 AND c.lease_until<now())
      RETURNING c.event_id
  ) UPDATE public.pulse_spy_events e SET body=body || '{"captureStatus":"unavailable"}'::jsonb,updated_at=now()
      FROM expired x WHERE e.id=x.event_id;
  SELECT c.event_id,e.body INTO job FROM public.pulse_spy_captures c
    JOIN public.pulse_spy_events e ON e.id=c.event_id
    WHERE c.state IN('queued','running') AND c.attempts<2 AND c.retry_at<=now()
      AND (c.lease_until IS NULL OR c.lease_until<now())
    ORDER BY c.attempts,e.at DESC,c.event_id LIMIT 1 FOR UPDATE OF c;
  -- An unexpired retry in backoff still needs a durable wake.
  IF job.event_id IS NULL AND EXISTS(SELECT 1 FROM public.pulse_spy_captures WHERE state IN ('queued','running')) THEN
    RETURN jsonb_build_object('busy',true);
  END IF;
  IF job.event_id IS NULL AND cfg.capture_checked_at>now()-interval '60 seconds' THEN RETURN NULL; END IF;
  UPDATE public.pulse_spy_config SET capture_lease=ticket,capture_lease_until=now()+interval '40 seconds' WHERE id;
  IF job.event_id IS NOT NULL THEN
    UPDATE public.pulse_spy_captures SET state='running',started_at=clock_timestamp(),attempts=attempts+1,lease=ticket,lease_until=now()+interval '40 seconds' WHERE event_id=job.event_id;
  END IF;
  RETURN jsonb_build_object('lease',ticket,'post',job.body);
END;
$$;

