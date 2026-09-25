-- SPY runs alongside the existing SPX500 feed. Existing events are never relabeled.
CREATE TABLE public.pulse_spy_config (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  worker_hash text CHECK(worker_hash ~ '^[a-f0-9]{64}$'),
  enabled boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  member_symbol text NOT NULL DEFAULT 'CAPITALCOM:SPX500' CHECK(member_symbol IN('CAPITALCOM:SPX500','AMEX:SPY')),
  capture_connected boolean NOT NULL DEFAULT false
);
INSERT INTO public.pulse_spy_config(id) VALUES(true);
CREATE TABLE public.pulse_spy_streams (
  timeframe smallint PRIMARY KEY CHECK(timeframe IN(5,15)),
  revision bigint NOT NULL DEFAULT 0,
  last_at bigint NOT NULL DEFAULT 0,
  snapshot jsonb
);
INSERT INTO public.pulse_spy_streams(timeframe) VALUES(5),(15);
CREATE TABLE public.pulse_spy_status (
  timeframe smallint PRIMARY KEY CHECK(timeframe IN(5,15)),
  at bigint NOT NULL DEFAULT 0, price numeric, zones jsonb NOT NULL DEFAULT '[]',
  received_at timestamptz, alert_expires_at timestamptz
);
INSERT INTO public.pulse_spy_status(timeframe) VALUES(5),(15);
CREATE TABLE public.pulse_spy_events (
  id text PRIMARY KEY, timeframe smallint NOT NULL CHECK(timeframe IN(5,15)),
  at bigint NOT NULL, body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pulse_spy_events_at ON public.pulse_spy_events(at DESC,id);
CREATE TABLE public.pulse_spy_zone_states (
  zone_id text PRIMARY KEY, timeframe smallint NOT NULL CHECK(timeframe IN(5,15)),
  body jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pulse_spy_zone_timeframe ON public.pulse_spy_zone_states(timeframe);
CREATE TABLE public.pulse_spy_incidents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, timeframe smallint NOT NULL,
  kind text NOT NULL CHECK(kind IN('delivery','expiry','capture')),
  opened_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,message text NOT NULL
);
CREATE UNIQUE INDEX pulse_spy_one_incident ON public.pulse_spy_incidents(timeframe,kind) WHERE resolved_at IS NULL;

ALTER TABLE public.pulse_spy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_spy_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_spy_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_spy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_spy_zone_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_spy_incidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pulse_spy_config,public.pulse_spy_streams,public.pulse_spy_status,public.pulse_spy_events,public.pulse_spy_zone_states,public.pulse_spy_incidents FROM anon,authenticated;
GRANT ALL ON public.pulse_spy_config,public.pulse_spy_streams,public.pulse_spy_status,public.pulse_spy_events,public.pulse_spy_zone_states,public.pulse_spy_incidents TO service_role;
GRANT SELECT ON public.pulse_spy_status,public.pulse_spy_events TO authenticated;
CREATE POLICY pulse_spy_status_members ON public.pulse_spy_status FOR SELECT TO authenticated USING(public.can_read_pulse((SELECT auth.uid())));
CREATE POLICY pulse_spy_events_members ON public.pulse_spy_events FOR SELECT TO authenticated USING(public.can_read_pulse((SELECT auth.uid())));

-- This capability is distinct from the TradingView delivery token and is held only
-- by the hosted receiver. No service-role key is copied to the receiver or browser.
CREATE FUNCTION public.pulse_spy_worker_allowed(p_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT length(p_token)=64 AND EXISTS(SELECT 1 FROM public.pulse_spy_config
    WHERE id AND enabled AND worker_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex'));
$$;
REVOKE ALL ON FUNCTION public.pulse_spy_worker_allowed(text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.pulse_spy_processing_state(p_token text,p_timeframe integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  RETURN (SELECT jsonb_build_object('revision',s.revision,'at',s.last_at,'posts',
    coalesce((SELECT jsonb_agg(z.body ORDER BY (z.body->>'at')::bigint,z.zone_id)
      FROM public.pulse_spy_zone_states z WHERE z.timeframe=p_timeframe),'[]'::jsonb))
    FROM public.pulse_spy_streams s WHERE s.timeframe=p_timeframe);
END;
$$;
CREATE FUNCTION public.pulse_spy_commit_snapshot(p_token text,p_revision bigint,p_snapshot jsonb,p_posts jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  tf integer := (p_snapshot->>'timeframe')::integer;
  incoming bigint := (p_snapshot->>'at')::bigint;
  current_row public.pulse_spy_streams%ROWTYPE;
  post jsonb; added integer := 0;
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF p_snapshot->>'symbol' IS DISTINCT FROM 'AMEX:SPY' OR p_snapshot->>'kind' IS DISTINCT FROM 'snapshot'
    OR p_snapshot->>'source' IS DISTINCT FROM 'indicator' OR tf NOT IN(5,15)
    OR incoming IS NULL OR incoming < extract(epoch FROM now())*1000-60000 OR incoming > extract(epoch FROM now())*1000+5000
    OR jsonb_typeof(p_posts) IS DISTINCT FROM 'array' OR jsonb_array_length(p_posts)>20
    OR jsonb_typeof(p_snapshot->'zones') IS DISTINCT FROM 'array' OR jsonb_array_length(p_snapshot->'zones')>2
    OR (p_snapshot->>'price')::numeric<=0 THEN RAISE EXCEPTION 'Invalid SPY snapshot'; END IF;
  SELECT * INTO STRICT current_row FROM public.pulse_spy_streams WHERE timeframe=tf FOR UPDATE;
  IF incoming<=current_row.last_at THEN RETURN jsonb_build_object('accepted',false,'posts',0); END IF;
  IF current_row.revision<>p_revision THEN RETURN jsonb_build_object('accepted',false,'conflict',true); END IF;
  FOR post IN SELECT value FROM jsonb_array_elements(p_posts) LOOP
    IF (post->>'timeframe')::integer IS DISTINCT FROM tf OR (post->>'at')::bigint IS DISTINCT FROM incoming
      OR post->>'source' IS DISTINCT FROM 'indicator' OR post->>'symbol' IS DISTINCT FROM 'AMEX:SPY'
      OR post ? 'chartUrl' OR post ? 'chartPath' THEN RAISE EXCEPTION 'Invalid SPY post'; END IF;
    post := post || '{"captureStatus":"unavailable"}'::jsonb;
    INSERT INTO public.pulse_spy_events(id,timeframe,at,body) VALUES(post->>'id',tf,incoming,post) ON CONFLICT(id) DO NOTHING;
    IF FOUND THEN
      added:=added+1;
      INSERT INTO public.pulse_spy_zone_states(zone_id,timeframe,body) VALUES(post->>'zoneId',tf,post)
        ON CONFLICT(zone_id) DO UPDATE SET body=excluded.body,updated_at=now();
    END IF;
  END LOOP;
  UPDATE public.pulse_spy_streams SET revision=revision+1,last_at=incoming,snapshot=p_snapshot WHERE timeframe=tf;
  UPDATE public.pulse_spy_status SET at=incoming,price=(p_snapshot->>'price')::numeric,zones=p_snapshot->'zones',received_at=now() WHERE timeframe=tf;
  UPDATE public.pulse_spy_incidents SET resolved_at=now() WHERE timeframe=tf AND kind='delivery' AND resolved_at IS NULL;
  RETURN jsonb_build_object('accepted',true,'posts',added);
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_spy_processing_state(text,integer),public.pulse_spy_commit_snapshot(text,bigint,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_spy_processing_state(text,integer),public.pulse_spy_commit_snapshot(text,bigint,jsonb,jsonb) TO anon,service_role;

CREATE FUNCTION public.pulse_feed_spy()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.can_read_pulse(auth.uid()) THEN RAISE EXCEPTION 'Pulse requires active membership' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('symbol','AMEX:SPY',
    'posts',coalesce((SELECT jsonb_agg(e.body ORDER BY e.at,e.id) FROM (
      SELECT body,at,id FROM public.pulse_spy_events ORDER BY at DESC,id DESC LIMIT 100)e),'[]'::jsonb),
    'receivedAt',(SELECT max(at) FROM public.pulse_spy_events),
    'indicatorAt',(SELECT jsonb_object_agg(timeframe,at) FROM public.pulse_spy_status),
    'quotes',(SELECT coalesce(jsonb_object_agg(timeframe,jsonb_build_object('price',price,'at',at,'zones',zones)),'{}'::jsonb) FROM public.pulse_spy_status WHERE at>0),
    'captureConnected',(SELECT capture_connected FROM public.pulse_spy_config WHERE id),
    'sessionOpen',extract(isodow FROM now() AT TIME ZONE 'America/New_York')<6
      AND (now() AT TIME ZONE 'America/New_York')::time>='09:00'::time
      AND (now() AT TIME ZONE 'America/New_York')::time<'16:00'::time);
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_feed_spy() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pulse_feed_spy() TO authenticated;

-- Cutover is explicit and server-controlled after both real SPY alerts are verified.
-- A stale SPY connection must never silently switch a member back to another asset.
CREATE FUNCTION public.pulse_feed_current()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.can_read_pulse(auth.uid()) THEN RAISE EXCEPTION 'Pulse requires active membership' USING ERRCODE='42501'; END IF;
  IF (SELECT member_symbol FROM public.pulse_spy_config WHERE id)='AMEX:SPY' THEN
    RETURN public.pulse_feed_spy();
  END IF;
  RETURN public.pulse_feed(0) || jsonb_build_object('symbol','CAPITALCOM:SPX500','captureConnected',false);
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_feed_current() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pulse_feed_current() TO authenticated;

CREATE FUNCTION public.pulse_spy_watchdog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  state public.pulse_spy_status%ROWTYPE; config public.pulse_spy_config%ROWTYPE;
  incident bigint; warning text; warning_kind text; ny timestamp:=now() AT TIME ZONE 'America/New_York';
BEGIN
  SELECT * INTO config FROM public.pulse_spy_config WHERE id;
  IF NOT config.enabled THEN RETURN; END IF;
  FOR state IN SELECT * FROM public.pulse_spy_status LOOP
    warning:=NULL; warning_kind:=NULL;
    IF extract(isodow FROM ny)<6 AND ny::time>='09:03'::time AND ny::time<'16:00'::time
      AND now()>config.started_at+interval '3 minutes'
      AND (state.received_at IS NULL OR state.received_at<now()-interval '3 minutes') THEN
      warning:='SPY '||state.timeframe||'m updates stopped. Check the TradingView alert.'; warning_kind:='delivery';
    ELSIF state.alert_expires_at<now()+interval '7 days' THEN
      warning:='SPY '||state.timeframe||'m alert needs renewal before '||to_char(state.alert_expires_at,'Mon DD')||'.'; warning_kind:='expiry';
    END IF;
    IF warning IS NOT NULL THEN
      incident:=NULL;
      INSERT INTO public.pulse_spy_incidents(timeframe,kind,message) VALUES(state.timeframe,warning_kind,warning)
        ON CONFLICT(timeframe,kind) WHERE resolved_at IS NULL DO NOTHING RETURNING id INTO incident;
      IF incident IS NOT NULL THEN
        INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
        SELECT DISTINCT ar.user_id,'announcement','SPY Pulse needs attention',warning,'/academy/community?tab=pulse'
          FROM public.academy_user_roles ar JOIN public.academy_roles r ON r.id=ar.role_id WHERE r.name='CEO';
      END IF;
    END IF;
  END LOOP;
  DELETE FROM public.pulse_spy_events WHERE created_at<now()-interval '30 days';
  DELETE FROM public.pulse_spy_zone_states WHERE updated_at<now()-interval '30 days' AND body->>'kind' IN('broken','retired');
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_spy_watchdog() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_spy_watchdog() TO service_role;
-- An absence of delivery has no event, so a hosted timer is required for detection.
SELECT cron.schedule('vault-spy-pulse-health','* * * * *','SELECT public.pulse_spy_watchdog()');
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_spy_status,public.pulse_spy_events;
