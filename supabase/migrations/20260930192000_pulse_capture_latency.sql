-- Private capture diagnostics and fresh-work priority. No change to alert delivery.
ALTER TABLE public.pulse_spy_captures ADD COLUMN started_at timestamptz, ADD COLUMN timing jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.pulse_spy_capture_claim(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  cfg public.pulse_spy_config%ROWTYPE; job record; ticket uuid:=gen_random_uuid();
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id FOR UPDATE;
  IF NOT cfg.capture_enabled OR cfg.capture_lease_until>now() THEN RETURN NULL; END IF;
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
  IF job.event_id IS NULL AND cfg.capture_checked_at>now()-interval '60 seconds' THEN RETURN NULL; END IF;
  UPDATE public.pulse_spy_config SET capture_lease=ticket,capture_lease_until=now()+interval '40 seconds' WHERE id;
  IF job.event_id IS NOT NULL THEN
    UPDATE public.pulse_spy_captures SET state='running',started_at=clock_timestamp(),attempts=attempts+1,lease=ticket,lease_until=now()+interval '40 seconds' WHERE event_id=job.event_id;
  END IF;
  RETURN jsonb_build_object('lease',ticket,'post',job.body);
END;
$$;

CREATE OR REPLACE FUNCTION public.pulse_spy_capture_finish(p_token text,p_lease uuid,p_event_id text,p_result jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  cfg public.pulse_spy_config%ROWTYPE; job public.pulse_spy_captures%ROWTYPE; event public.pulse_spy_events%ROWTYPE;
  capture_time bigint; issue bigint; ok boolean:=coalesce((p_result->>'ok')::boolean,false);
  v_failure text:=left(coalesce(p_result->>'failure','capture-unavailable'),100);
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id FOR UPDATE;
  IF cfg.capture_lease IS DISTINCT FROM p_lease OR cfg.capture_lease_until<now() THEN RETURN false; END IF;
  IF p_event_id IS NOT NULL THEN
    SELECT * INTO STRICT job FROM public.pulse_spy_captures WHERE event_id=p_event_id FOR UPDATE;
    SELECT * INTO STRICT event FROM public.pulse_spy_events WHERE id=p_event_id;
    IF job.lease IS DISTINCT FROM p_lease THEN RETURN false; END IF;
    -- Accept numeric duration fields only; no provider/page/session data.
    UPDATE public.pulse_spy_captures SET timing=coalesce((
      SELECT jsonb_object_agg(key,value) FROM jsonb_each(
        CASE WHEN jsonb_typeof(p_result->'timing')='object' THEN p_result->'timing' ELSE '{}'::jsonb END)
      WHERE key IN ('connectMs','setupMs','frameMs','verifyBeforeMs','cropMs','screenshotMs','verifyAfterMs','storeMs','recoveryMs','cleanupMs')
        AND jsonb_typeof(value)='number'
    ),'{}'::jsonb) WHERE event_id=p_event_id;
    IF ok THEN
      capture_time:=(p_result->>'capturedAt')::bigint;
      IF p_result->>'symbol' IS DISTINCT FROM 'AMEX:SPY'
        OR (p_result->>'timeframe')::integer IS DISTINCT FROM event.timeframe
        OR p_result->>'indicator' IS DISTINCT FROM 'Vault Zone Pulse - SPY Live'
        OR capture_time IS NULL OR capture_time<event.at OR capture_time>event.at+90000
        OR capture_time<extract(epoch FROM now())*1000-30000 OR capture_time>extract(epoch FROM now())*1000+5000
        OR p_result->>'imageId' IS NULL THEN RAISE EXCEPTION 'Invalid capture provenance'; END IF;
      UPDATE public.pulse_spy_captures SET state='ready',failure=NULL,captured_at=capture_time,image_id=(p_result->>'imageId')::uuid,lease_until=NULL WHERE event_id=p_event_id;
      UPDATE public.pulse_spy_events SET body=(body-'captureStatus') || jsonb_build_object('capturedAt',capture_time),updated_at=now() WHERE id=p_event_id;
    ELSE
      UPDATE public.pulse_spy_captures SET state=CASE WHEN attempts<2 AND event.at>extract(epoch FROM now())*1000-65000 THEN 'queued' ELSE 'unavailable' END,
        failure=v_failure,lease_until=NULL,retry_at=now()+interval '10 seconds' WHERE event_id=p_event_id;
      UPDATE public.pulse_spy_events SET body=body || jsonb_build_object('captureStatus',CASE WHEN (SELECT state FROM public.pulse_spy_captures WHERE event_id=p_event_id)='queued' THEN 'pending' ELSE 'unavailable' END),updated_at=now() WHERE id=p_event_id;
    END IF;
  END IF;
  UPDATE public.pulse_spy_config SET capture_connected=ok,capture_checked_at=now(),capture_lease=NULL,capture_lease_until=NULL WHERE id;
  IF ok THEN
    UPDATE public.pulse_spy_incidents SET resolved_at=now() WHERE kind='capture' AND resolved_at IS NULL;
  ELSE
    INSERT INTO public.pulse_spy_incidents(timeframe,kind,message) VALUES(0,'capture','SPY chart capture needs attention: '||v_failure)
      ON CONFLICT(timeframe,kind) WHERE resolved_at IS NULL DO NOTHING RETURNING id INTO issue;
    IF issue IS NOT NULL THEN
      INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
        SELECT DISTINCT ar.user_id,'announcement','Pulse chart capture needs attention','SPY zone alerts continue. The hosted TradingView chart needs checking.','/academy/community?tab=pulse'
        FROM public.academy_user_roles ar JOIN public.academy_roles r ON r.id=ar.role_id WHERE r.name='CEO';
    END IF;
  END IF;
  RETURN true;
END;
$$;
