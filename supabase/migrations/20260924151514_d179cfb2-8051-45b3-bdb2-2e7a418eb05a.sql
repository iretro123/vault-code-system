-- lovable-cron-fallback-reviewed: detecting absence of TradingView deliveries within 3 minutes is time-based; no event exists to trigger on
-- Vault Pulse is isolated from chat messages and their broadcast/push triggers.
CREATE TABLE public.pulse_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  delivery_hash text CHECK (delivery_hash ~ '^[a-f0-9]{64}$'),
  enabled boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.pulse_config(id) VALUES (true);

CREATE TABLE public.pulse_streams (
  timeframe smallint PRIMARY KEY CHECK (timeframe IN (5,15)),
  revision bigint NOT NULL DEFAULT 0,
  last_at bigint NOT NULL DEFAULT 0,
  snapshot jsonb
);
INSERT INTO public.pulse_streams(timeframe) VALUES (5),(15);

CREATE TABLE public.pulse_status (
  timeframe smallint PRIMARY KEY CHECK (timeframe IN (5,15)),
  at bigint NOT NULL DEFAULT 0,
  price numeric,
  zones jsonb NOT NULL DEFAULT '[]',
  received_at timestamptz,
  alert_expires_at timestamptz
);
INSERT INTO public.pulse_status(timeframe,alert_expires_at) VALUES
  (5,'2026-10-25T10:56:00Z'),(15,'2026-10-25T10:54:00Z');

CREATE TABLE public.pulse_events (
  id text PRIMARY KEY,
  timeframe smallint NOT NULL CHECK (timeframe IN (5,15)),
  at bigint NOT NULL,
  body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pulse_events_at_idx ON public.pulse_events(at DESC,id);
CREATE TABLE public.pulse_zone_states (
  zone_id text PRIMARY KEY,
  timeframe smallint NOT NULL CHECK (timeframe IN (5,15)),
  body jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pulse_zone_states_timeframe_idx ON public.pulse_zone_states(timeframe);
CREATE TABLE public.pulse_incidents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timeframe smallint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('delivery','expiry')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  message text NOT NULL
);
CREATE UNIQUE INDEX pulse_one_open_incident ON public.pulse_incidents(timeframe,kind) WHERE resolved_at IS NULL;

CREATE FUNCTION public.can_read_pulse(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
    WHERE p.user_id=p_user AND coalesce(p.is_banned,false)=false
      AND coalesce(p.access_status,'') <> 'banned'
      AND lower(coalesce(u.email,'')) <> 'guest@vaulttradingacademy.com'
      AND coalesce(u.raw_user_meta_data->>'is_shared_guest','false') <> 'true'
      AND (
        EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=p_user AND (
          r.role::text IN ('operator','vault_os_owner') OR (
            r.role::text IN ('vault_access','vault_intelligence')
            AND r.subscription_status IN ('active','trialing')
            AND (r.subscription_expires_at IS NULL OR r.subscription_expires_at>now())
          )
        )) OR EXISTS (
          SELECT 1 FROM public.academy_user_roles ar JOIN public.academy_roles r ON r.id=ar.role_id
          WHERE ar.user_id=p_user AND r.name IN ('CEO','Admin','Coach')
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_read_pulse(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_pulse(uuid) TO authenticated,service_role;

ALTER TABLE public.pulse_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_zone_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_incidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pulse_config,public.pulse_streams,public.pulse_zone_states,public.pulse_status,public.pulse_events,public.pulse_incidents FROM anon,authenticated;
GRANT ALL ON public.pulse_config,public.pulse_streams,public.pulse_zone_states,public.pulse_status,public.pulse_events,public.pulse_incidents TO service_role;
GRANT SELECT ON public.pulse_status,public.pulse_events TO authenticated;
CREATE POLICY pulse_status_members ON public.pulse_status FOR SELECT TO authenticated USING (public.can_read_pulse((SELECT auth.uid())));
CREATE POLICY pulse_events_members ON public.pulse_events FOR SELECT TO authenticated USING (public.can_read_pulse((SELECT auth.uid())));

CREATE FUNCTION public.pulse_authorize_delivery(p_hash text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.pulse_config WHERE id AND enabled AND delivery_hash=p_hash);
$$;
CREATE FUNCTION public.pulse_processing_state(p_timeframe integer)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object('revision',s.revision,'at',s.last_at,'posts',
    coalesce((SELECT jsonb_agg(z.body ORDER BY (z.body->>'at')::bigint,z.zone_id)
      FROM public.pulse_zone_states z WHERE z.timeframe=p_timeframe),'[]'::jsonb))
  FROM public.pulse_streams s WHERE s.timeframe=p_timeframe;
$$;
CREATE FUNCTION public.pulse_commit_snapshot(p_revision bigint,p_snapshot jsonb,p_posts jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  tf integer := (p_snapshot->>'timeframe')::integer;
  incoming bigint := (p_snapshot->>'at')::bigint;
  current_row public.pulse_streams%ROWTYPE;
  post jsonb;
  added integer := 0;
BEGIN
  SELECT * INTO STRICT current_row FROM public.pulse_streams WHERE timeframe=tf FOR UPDATE;
  IF incoming<=current_row.last_at THEN RETURN jsonb_build_object('accepted',false,'posts',0); END IF;
  IF current_row.revision<>p_revision THEN RETURN jsonb_build_object('accepted',false,'conflict',true); END IF;
  IF p_snapshot->>'symbol'<>'CAPITALCOM:SPX500' OR p_snapshot->>'kind'<>'snapshot'
    OR jsonb_typeof(p_posts)<>'array' OR jsonb_array_length(p_posts)>20 THEN
    RAISE EXCEPTION 'Invalid Pulse commit';
  END IF;
  FOR post IN SELECT value FROM jsonb_array_elements(p_posts) LOOP
    IF (post->>'timeframe')::integer<>tf OR (post->>'at')::bigint<>incoming OR post->>'source'<>'indicator' THEN
      RAISE EXCEPTION 'Invalid Pulse post';
    END IF;
    INSERT INTO public.pulse_events(id,timeframe,at,body)
      VALUES(post->>'id',tf,incoming,post) ON CONFLICT(id) DO NOTHING;
    IF FOUND THEN
      added:=added+1;
      INSERT INTO public.pulse_zone_states(zone_id,timeframe,body) VALUES(post->>'zoneId',tf,post)
        ON CONFLICT(zone_id) DO UPDATE SET body=excluded.body,updated_at=now();
    END IF;
  END LOOP;
  UPDATE public.pulse_streams SET revision=revision+1,last_at=incoming,snapshot=p_snapshot WHERE timeframe=tf;
  UPDATE public.pulse_status SET at=incoming,price=(p_snapshot->>'price')::numeric,
    zones=p_snapshot->'zones',received_at=now() WHERE timeframe=tf;
  UPDATE public.pulse_incidents SET resolved_at=now() WHERE timeframe=tf AND kind='delivery' AND resolved_at IS NULL;
  RETURN jsonb_build_object('accepted',true,'posts',added);
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_authorize_delivery(text), public.pulse_processing_state(integer), public.pulse_commit_snapshot(bigint,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_authorize_delivery(text), public.pulse_processing_state(integer), public.pulse_commit_snapshot(bigint,jsonb,jsonb) TO service_role;

CREATE FUNCTION public.pulse_feed(p_after bigint DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.can_read_pulse(auth.uid()) THEN RAISE EXCEPTION 'Pulse requires active membership' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object(
    'posts',coalesce((SELECT jsonb_agg(e.body ORDER BY e.at,e.id) FROM (
      SELECT body,at,id FROM public.pulse_events WHERE p_after=0 OR at>=p_after ORDER BY at DESC,id DESC LIMIT 100
    )e),'[]'::jsonb),
    'receivedAt',(SELECT max(at) FROM public.pulse_events),
    'indicatorAt',(SELECT jsonb_object_agg(timeframe,at) FROM public.pulse_status),
    'quotes',(SELECT coalesce(jsonb_object_agg(timeframe,jsonb_build_object('price',price,'at',at,'zones',zones)),'{}'::jsonb) FROM public.pulse_status WHERE at>0),
    'sessionOpen', extract(isodow FROM now() AT TIME ZONE 'America/New_York')<6
      AND (now() AT TIME ZONE 'America/New_York')::time>='09:00'::time
      AND (now() AT TIME ZONE 'America/New_York')::time<'16:00'::time
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_feed(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pulse_feed(bigint) TO authenticated;

-- Runs in the hosted database even when every member's device is offline.
CREATE FUNCTION public.pulse_watchdog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  state public.pulse_status%ROWTYPE;
  config public.pulse_config%ROWTYPE;
  incident_id bigint;
  warning text;
  warning_kind text;
  ny timestamp := now() AT TIME ZONE 'America/New_York';
BEGIN
  SELECT * INTO config FROM public.pulse_config WHERE id;
  IF NOT config.enabled THEN RETURN; END IF;
  FOR state IN SELECT * FROM public.pulse_status LOOP
    warning:=NULL; warning_kind:=NULL;
    IF extract(isodow FROM ny)<6 AND ny::time>='09:03'::time AND ny::time<'16:00'::time
      AND now()>config.started_at+interval '3 minutes'
      AND (state.received_at IS NULL OR state.received_at<now()-interval '3 minutes') THEN
      warning:=state.timeframe||'m Pulse updates stopped. Check TradingView alert delivery.';
      warning_kind:='delivery';
    ELSIF state.alert_expires_at<now()+interval '7 days' THEN
      warning:=state.timeframe||'m TradingView alert expires on '||to_char(state.alert_expires_at AT TIME ZONE 'America/New_York','Mon DD')||'. Renew it to keep Pulse running.';
      warning_kind:='expiry';
    END IF;
    IF warning IS NOT NULL THEN
      incident_id:=NULL;
      INSERT INTO public.pulse_incidents(timeframe,kind,message) VALUES(state.timeframe,warning_kind,warning)
        ON CONFLICT(timeframe,kind) WHERE resolved_at IS NULL DO NOTHING RETURNING id INTO incident_id;
      IF incident_id IS NOT NULL THEN
        INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
        SELECT DISTINCT ar.user_id,'announcement','Pulse needs attention',warning,'/academy/community?tab=pulse'
        FROM public.academy_user_roles ar JOIN public.academy_roles r ON r.id=ar.role_id
        WHERE r.name='CEO';
      END IF;
    END IF;
  END LOOP;
  DELETE FROM public.pulse_events WHERE created_at<now()-interval '30 days';
  DELETE FROM public.pulse_zone_states WHERE updated_at<now()-interval '30 days' AND body->>'kind' IN ('broken','retired');
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_watchdog() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_watchdog() TO service_role;
SELECT cron.schedule('vault-pulse-health','* * * * *','SELECT public.pulse_watchdog()');
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_status,public.pulse_events;