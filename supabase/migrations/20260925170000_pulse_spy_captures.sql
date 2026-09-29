-- Screenshots have an independent, bounded delivery path. Alert receipt must not
-- wait for a browser, and an old event must never receive a current screenshot.
ALTER TABLE public.pulse_spy_config
  ADD COLUMN capture_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN capture_checked_at timestamptz,
  ADD COLUMN capture_lease uuid,
  ADD COLUMN capture_lease_until timestamptz,
  ADD COLUMN capture_image_key text;

CREATE TABLE public.pulse_spy_captures (
  event_id text PRIMARY KEY REFERENCES public.pulse_spy_events(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'queued' CHECK(state IN('queued','running','ready','unavailable')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 2),
  lease uuid, lease_until timestamptz, retry_at timestamptz NOT NULL DEFAULT now(),
  image_id uuid, captured_at bigint, failure text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pulse_spy_captures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pulse_spy_captures FROM anon,authenticated;
GRANT ALL ON public.pulse_spy_captures TO service_role;

-- AFTER insert because the queue has a foreign key to the durable event.
CREATE FUNCTION public.pulse_spy_queue_capture()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (SELECT capture_enabled FROM public.pulse_spy_config WHERE id)
    AND NEW.at BETWEEN extract(epoch FROM now())*1000-60000 AND extract(epoch FROM now())*1000+5000 THEN
    INSERT INTO public.pulse_spy_captures(event_id) VALUES(NEW.id) ON CONFLICT DO NOTHING;
    UPDATE public.pulse_spy_events SET body=body || '{"captureStatus":"pending"}'::jsonb WHERE id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pulse_spy_capture_insert AFTER INSERT ON public.pulse_spy_events FOR EACH ROW EXECUTE FUNCTION public.pulse_spy_queue_capture();
REVOKE ALL ON FUNCTION public.pulse_spy_queue_capture() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.pulse_spy_capture_claim(p_token text)
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
    ORDER BY e.at,c.event_id LIMIT 1 FOR UPDATE OF c;
  IF job.event_id IS NULL AND cfg.capture_checked_at>now()-interval '60 seconds' THEN RETURN NULL; END IF;
  UPDATE public.pulse_spy_config SET capture_lease=ticket,capture_lease_until=now()+interval '40 seconds' WHERE id;
  IF job.event_id IS NOT NULL THEN
    UPDATE public.pulse_spy_captures SET state='running',attempts=attempts+1,lease=ticket,lease_until=now()+interval '40 seconds' WHERE event_id=job.event_id;
  END IF;
  RETURN jsonb_build_object('lease',ticket,'post',job.body);
END;
$$;

CREATE FUNCTION public.pulse_spy_capture_finish(p_token text,p_lease uuid,p_event_id text,p_result jsonb)
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
    IF ok THEN
      capture_time:=(p_result->>'capturedAt')::bigint;
      IF p_result->>'symbol' IS DISTINCT FROM 'AMEX:SPY'
        OR (p_result->>'timeframe')::integer IS DISTINCT FROM event.timeframe
        OR p_result->>'indicator' IS DISTINCT FROM 'Vault Zone Pulse - SPY Live'
        OR capture_time IS NULL OR capture_time<event.at OR capture_time>event.at+90000
        OR capture_time<extract(epoch FROM now())*1000-30000 OR capture_time>extract(epoch FROM now())*1000+5000
        OR p_result->>'imageId' IS NULL THEN RAISE EXCEPTION 'Invalid capture provenance'; END IF;
      UPDATE public.pulse_spy_captures SET state='ready',captured_at=capture_time,image_id=(p_result->>'imageId')::uuid,lease_until=NULL WHERE event_id=p_event_id;
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
REVOKE ALL ON FUNCTION public.pulse_spy_capture_claim(text),public.pulse_spy_capture_finish(text,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_spy_capture_claim(text),public.pulse_spy_capture_finish(text,uuid,text,jsonb) TO anon,service_role;

CREATE OR REPLACE FUNCTION public.pulse_feed_spy()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.pulse_spy_config%ROWTYPE; expiry text:=(floor(extract(epoch FROM now())/1800)::bigint*1800+3600)::text;
BEGIN
  IF NOT public.can_read_pulse(auth.uid()) THEN RAISE EXCEPTION 'Pulse requires active membership' USING ERRCODE='42501'; END IF;
  SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id;
  RETURN jsonb_build_object('symbol','AMEX:SPY',
    'posts',coalesce((SELECT jsonb_agg(e.body || CASE WHEN c.state='ready' AND cfg.capture_image_key IS NOT NULL THEN
      jsonb_build_object('chartUrl','https://vault-spy-pulse.iruben597.workers.dev/image/'||c.image_id||'?expires='||expiry||'&signature='||
        encode(extensions.hmac(convert_to(c.image_id||':'||expiry,'UTF8'),decode(cfg.capture_image_key,'hex'),'sha256'),'hex')) ELSE '{}'::jsonb END ORDER BY e.at,e.id)
      FROM (SELECT body,at,id FROM public.pulse_spy_events ORDER BY at DESC,id DESC LIMIT 100)e
      LEFT JOIN public.pulse_spy_captures c ON c.event_id=e.id),'[]'::jsonb),
    'receivedAt',(SELECT max(at) FROM public.pulse_spy_events),
    'indicatorAt',(SELECT jsonb_object_agg(timeframe,at) FROM public.pulse_spy_status),
    'quotes',(SELECT coalesce(jsonb_object_agg(timeframe,jsonb_build_object('price',price,'at',at,'zones',zones)),'{}'::jsonb) FROM public.pulse_spy_status WHERE at>0),
    'captureConnected',coalesce(cfg.capture_enabled AND cfg.capture_connected AND cfg.capture_checked_at>now()-interval '3 minutes',false),
    'sessionOpen',extract(isodow FROM now() AT TIME ZONE 'America/New_York')<6
      AND (now() AT TIME ZONE 'America/New_York')::time>='09:00'::time
      AND (now() AT TIME ZONE 'America/New_York')::time<'16:00'::time);
END;
$$;
