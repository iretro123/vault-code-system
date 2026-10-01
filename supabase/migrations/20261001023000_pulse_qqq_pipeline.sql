-- Isolated QQQ streams, shared durable event/capture queue and browser lease.
ALTER TABLE public.pulse_spy_config ADD COLUMN qqq_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE public.pulse_qqq_streams (LIKE public.pulse_spy_streams INCLUDING ALL);
CREATE TABLE public.pulse_qqq_status (LIKE public.pulse_spy_status INCLUDING ALL);
CREATE TABLE public.pulse_qqq_zone_states (LIKE public.pulse_spy_zone_states INCLUDING ALL);
INSERT INTO public.pulse_qqq_streams(timeframe) VALUES(5),(15);
INSERT INTO public.pulse_qqq_status(timeframe) VALUES(5),(15);
ALTER TABLE public.pulse_qqq_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_qqq_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_qqq_zone_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pulse_qqq_streams,public.pulse_qqq_status,public.pulse_qqq_zone_states FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.pulse_qqq_streams,public.pulse_qqq_status,public.pulse_qqq_zone_states TO service_role;
GRANT SELECT ON public.pulse_qqq_status TO authenticated;
CREATE POLICY pulse_qqq_status_members ON public.pulse_qqq_status FOR SELECT TO authenticated USING(public.can_read_pulse((SELECT auth.uid())));
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_qqq_status;
CREATE VIEW public.pulse_market_status WITH (security_invoker=true) AS
 SELECT 'AMEX:SPY'::text symbol,timeframe,at,price,zones,received_at,alert_expires_at FROM public.pulse_spy_status
 UNION ALL SELECT 'NASDAQ:QQQ',timeframe,at,price,zones,received_at,alert_expires_at FROM public.pulse_qqq_status;
REVOKE ALL ON public.pulse_market_status FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.pulse_qqq_processing_state(p_token text,p_timeframe integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) OR NOT (SELECT qqq_enabled FROM public.pulse_spy_config WHERE id) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  RETURN (SELECT jsonb_build_object('revision',s.revision,'at',s.last_at,'posts',
    coalesce((SELECT jsonb_agg(z.body ORDER BY (z.body->>'at')::bigint,z.zone_id)
      FROM public.pulse_qqq_zone_states z WHERE z.timeframe=p_timeframe),'[]'::jsonb))
    FROM public.pulse_qqq_streams s WHERE s.timeframe=p_timeframe);
END;
$$;
CREATE FUNCTION public.pulse_qqq_commit_snapshot(p_token text,p_revision bigint,p_snapshot jsonb,p_posts jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  tf integer := (p_snapshot->>'timeframe')::integer;
  incoming bigint := (p_snapshot->>'at')::bigint;
  current_row public.pulse_qqq_streams%ROWTYPE;
  post jsonb; added integer := 0;
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) OR NOT (SELECT qqq_enabled FROM public.pulse_spy_config WHERE id) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF p_snapshot->>'symbol' IS DISTINCT FROM 'NASDAQ:QQQ' OR p_snapshot->>'kind' IS DISTINCT FROM 'snapshot'
    OR p_snapshot->>'source' IS DISTINCT FROM 'indicator' OR tf NOT IN(5,15)
    OR incoming IS NULL OR incoming < extract(epoch FROM now())*1000-60000 OR incoming > extract(epoch FROM now())*1000+5000
    OR jsonb_typeof(p_posts) IS DISTINCT FROM 'array' OR jsonb_array_length(p_posts)>20
    OR jsonb_typeof(p_snapshot->'zones') IS DISTINCT FROM 'array' OR jsonb_array_length(p_snapshot->'zones')>2
    OR (p_snapshot->>'price')::numeric<=0 THEN RAISE EXCEPTION 'Invalid QQQ snapshot'; END IF;
  SELECT * INTO STRICT current_row FROM public.pulse_qqq_streams WHERE timeframe=tf FOR UPDATE;
  IF incoming<=current_row.last_at THEN RETURN jsonb_build_object('accepted',false,'posts',0); END IF;
  IF current_row.revision<>p_revision THEN RETURN jsonb_build_object('accepted',false,'conflict',true); END IF;
  FOR post IN SELECT value FROM jsonb_array_elements(p_posts) LOOP
    IF (post->>'timeframe')::integer IS DISTINCT FROM tf OR (post->>'at')::bigint IS DISTINCT FROM incoming
      OR post->>'source' IS DISTINCT FROM 'indicator' OR post->>'symbol' IS DISTINCT FROM 'NASDAQ:QQQ'
      OR post ? 'chartUrl' OR post ? 'chartPath' THEN RAISE EXCEPTION 'Invalid QQQ post'; END IF;
    post := post || '{"captureStatus":"unavailable"}'::jsonb;
    INSERT INTO public.pulse_spy_events(id,timeframe,at,body) VALUES(post->>'id',tf,incoming,post) ON CONFLICT(id) DO NOTHING;
    IF FOUND THEN
      added:=added+1;
      INSERT INTO public.pulse_qqq_zone_states(zone_id,timeframe,body) VALUES(post->>'zoneId',tf,post)
        ON CONFLICT(zone_id) DO UPDATE SET body=excluded.body,updated_at=now();
    END IF;
  END LOOP;
  UPDATE public.pulse_qqq_streams SET revision=revision+1,last_at=incoming,snapshot=p_snapshot WHERE timeframe=tf;
  UPDATE public.pulse_qqq_status SET at=incoming,price=(p_snapshot->>'price')::numeric,zones=p_snapshot->'zones',received_at=now() WHERE timeframe=tf;

  RETURN jsonb_build_object('accepted',true,'posts',added);
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_qqq_processing_state(text,integer),public.pulse_qqq_commit_snapshot(text,bigint,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_qqq_processing_state(text,integer),public.pulse_qqq_commit_snapshot(text,bigint,jsonb,jsonb) TO anon,service_role;

CREATE OR REPLACE FUNCTION public.pulse_spy_capture_claim(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  cfg public.pulse_spy_config%ROWTYPE; job record; refresh_quote bigint; refresh_price numeric; ticket uuid:=gen_random_uuid();
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
  -- Repair only a missing image of the exact zone still reported by a fresh feed.
  -- New event jobs above always take priority. Original event time never changes.
  IF job.event_id IS NULL THEN
    SELECT c.event_id,e.body,s.at,s.price INTO job
      FROM public.pulse_spy_captures c JOIN public.pulse_spy_events e ON e.id=c.event_id
      JOIN public.pulse_market_status s ON s.timeframe=e.timeframe AND s.symbol=e.body->>'symbol'
      WHERE c.state='unavailable' AND c.image_id IS NULL AND c.retry_at<=now()
        AND s.at BETWEEN extract(epoch FROM now())*1000-60000 AND extract(epoch FROM now())*1000
        AND e.body->>'kind' NOT IN ('broken','breached','retired')
        AND EXISTS(SELECT 1 FROM jsonb_array_elements(s.zones) z
          WHERE z->>'zoneId'=e.body->>'zoneId' AND z->>'side'=e.body->>'side'
            AND (z->>'lower')::numeric=(e.body->>'lower')::numeric AND (z->>'upper')::numeric=(e.body->>'upper')::numeric)
      ORDER BY e.at DESC LIMIT 1 FOR UPDATE OF c;
    IF job.event_id IS NOT NULL THEN
      refresh_quote:=job.at; refresh_price:=job.price;
    END IF;
  END IF;
  IF job.event_id IS NULL AND cfg.capture_checked_at>now()-interval '60 seconds' THEN RETURN NULL; END IF;
  UPDATE public.pulse_spy_config SET capture_lease=ticket,capture_lease_until=now()+interval '40 seconds' WHERE id;
  IF job.event_id IS NOT NULL THEN
    UPDATE public.pulse_spy_captures SET state='running',started_at=clock_timestamp(),attempts=CASE WHEN refresh_quote IS NULL THEN attempts+1 ELSE attempts END,refresh_attempts=refresh_attempts+CASE WHEN refresh_quote IS NULL THEN 0 ELSE 1 END,lease=ticket,lease_until=now()+interval '40 seconds',context=CASE WHEN refresh_quote IS NOT NULL THEN 'refresh' ELSE context END,refresh_quote_at=refresh_quote,retry_at=now()+interval '120 seconds' WHERE event_id=job.event_id;
  END IF;
  RETURN jsonb_build_object('lease',ticket,'post',CASE WHEN refresh_quote IS NOT NULL THEN job.body || jsonb_build_object('at',refresh_quote,'price',refresh_price,'kind','observed','captureContext','refresh') ELSE job.body END);
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
      IF p_result->>'symbol' IS DISTINCT FROM event.body->>'symbol' OR event.body->>'symbol' NOT IN ('AMEX:SPY','NASDAQ:QQQ')
        OR (p_result->>'timeframe')::integer IS DISTINCT FROM event.timeframe
        OR NOT coalesce((p_result->>'indicator'='Vault Zone Pulse - SPY & QQQ' OR (event.body->>'symbol'='AMEX:SPY' AND p_result->>'indicator'='Vault Zone Pulse - SPY Live')),false)
        OR capture_time IS NULL OR capture_time<event.at OR (job.context<>'refresh' AND capture_time>event.at+90000)
        OR capture_time<extract(epoch FROM now())*1000-30000 OR capture_time>extract(epoch FROM now())*1000+5000
        OR p_result->>'imageId' IS NULL THEN RAISE EXCEPTION 'Invalid capture provenance'; END IF;
      IF job.context='refresh' AND (job.refresh_quote_at IS NULL OR capture_time<job.refresh_quote_at OR capture_time>job.refresh_quote_at+90000
        OR NOT EXISTS(SELECT 1 FROM public.pulse_market_status s CROSS JOIN LATERAL jsonb_array_elements(s.zones) z
          WHERE s.timeframe=event.timeframe AND s.symbol=event.body->>'symbol' AND s.at>=job.refresh_quote_at AND s.at>extract(epoch FROM now())*1000-90000
            AND z->>'zoneId'=event.body->>'zoneId' AND z->>'side'=event.body->>'side'
            AND (z->>'lower')::numeric=(event.body->>'lower')::numeric AND (z->>'upper')::numeric=(event.body->>'upper')::numeric)) THEN
        UPDATE public.pulse_spy_captures SET state='unavailable',failure='active-zone-changed',lease_until=NULL,retry_at=now()+interval '120 seconds' WHERE event_id=p_event_id;
        UPDATE public.pulse_spy_config SET capture_lease=NULL,capture_lease_until=NULL WHERE id;
        RETURN true;
      END IF;
      UPDATE public.pulse_spy_captures SET state='ready',failure=NULL,captured_at=capture_time,image_id=(p_result->>'imageId')::uuid,lease_until=NULL WHERE event_id=p_event_id;
      UPDATE public.pulse_spy_events SET body=(body-'captureStatus') || jsonb_build_object('capturedAt',capture_time),updated_at=now() WHERE id=p_event_id;
    ELSE
      UPDATE public.pulse_spy_captures SET state=CASE WHEN attempts<2 AND event.at>extract(epoch FROM now())*1000-65000 THEN 'queued' ELSE 'unavailable' END,
        failure=v_failure,lease_until=NULL,retry_at=now()+CASE WHEN job.context='refresh' THEN interval '120 seconds' ELSE interval '10 seconds' END WHERE event_id=p_event_id;
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
CREATE OR REPLACE FUNCTION public.pulse_feed_symbol(p_symbol text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE cfg public.pulse_spy_config%ROWTYPE; expiry text:=(floor(extract(epoch FROM now())/1800)::bigint*1800+3600)::text;
BEGIN
  IF NOT public.can_read_pulse(auth.uid()) THEN RAISE EXCEPTION 'Pulse requires active membership' USING ERRCODE='42501'; END IF;
  IF p_symbol NOT IN ('AMEX:SPY','NASDAQ:QQQ') OR p_symbol IS NULL THEN RAISE EXCEPTION 'Unsupported symbol'; END IF;
  SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id;
  RETURN jsonb_build_object('symbol',p_symbol,'enabled',CASE WHEN p_symbol='NASDAQ:QQQ' THEN cfg.qqq_enabled ELSE cfg.enabled END,
    'posts',coalesce((SELECT jsonb_agg(e.body || CASE WHEN c.state='ready' AND cfg.capture_image_key IS NOT NULL THEN
      jsonb_build_object('capturedAt',c.captured_at,'captureContext',c.context,'chartUrl','https://vault-spy-pulse.iruben597.workers.dev/image/'||c.image_id||'?expires='||expiry||'&signature='||
        encode(extensions.hmac(convert_to(c.image_id||':'||expiry,'UTF8'),decode(cfg.capture_image_key,'hex'),'sha256'),'hex')) ELSE '{}'::jsonb END ORDER BY e.at,e.id)
      FROM (SELECT body,at,id FROM public.pulse_spy_events WHERE body->>'symbol'=p_symbol ORDER BY at DESC,id DESC LIMIT 100)e
      LEFT JOIN public.pulse_spy_captures c ON c.event_id=e.id),'[]'::jsonb),
    'receivedAt',(SELECT max(at) FROM public.pulse_spy_events WHERE body->>'symbol'=p_symbol),
    'indicatorAt',(SELECT jsonb_object_agg(timeframe,at) FROM public.pulse_market_status WHERE symbol=p_symbol),
    'quotes',(SELECT coalesce(jsonb_object_agg(s.timeframe,jsonb_build_object('price',s.price,'at',s.at,'zones',s.zones) ||
      CASE WHEN c.image_id IS NOT NULL AND cfg.capture_image_key IS NOT NULL THEN
        jsonb_build_object('chartCapturedAt',c.captured_at,'chartContext',c.context,'chartUrl','https://vault-spy-pulse.iruben597.workers.dev/image/'||c.image_id||'?expires='||expiry||'&signature='||
          encode(extensions.hmac(convert_to(c.image_id||':'||expiry,'UTF8'),decode(cfg.capture_image_key,'hex'),'sha256'),'hex')) ||
        CASE WHEN c.liquidity_image_id IS NOT NULL AND c.liquidity_captured_at IS NOT NULL AND abs(c.liquidity_captured_at-c.captured_at)<=90000 THEN
          jsonb_build_object('liquidityChart',jsonb_build_object('baseCapturedAt',c.captured_at,'capturedAt',c.liquidity_captured_at,
            'url','https://vault-spy-pulse.iruben597.workers.dev/image/'||c.liquidity_image_id||'?expires='||expiry||'&signature='||
              encode(extensions.hmac(convert_to(c.liquidity_image_id||':'||expiry,'UTF8'),decode(cfg.capture_image_key,'hex'),'sha256'),'hex')))
          ELSE '{}'::jsonb END ELSE '{}'::jsonb END),'{}'::jsonb)
      FROM public.pulse_market_status s LEFT JOIN LATERAL (
        SELECT image_id,captured_at,liquidity_image_id,liquidity_captured_at,context FROM (
          SELECT sc.image_id,sc.captured_at,sc.liquidity_image_id,sc.liquidity_captured_at,'refresh'::text context,0 priority
          FROM public.pulse_spy_snapshot_charts sc
          WHERE p_symbol='AMEX:SPY' AND sc.timeframe=s.timeframe AND sc.quote_at=s.at AND sc.expires_at>now()
          UNION ALL
          SELECT pc.image_id,pc.captured_at,NULL::uuid,NULL::bigint,'earlier'::text,1
          FROM public.pulse_spy_events pe JOIN public.pulse_spy_captures pc ON pc.event_id=pe.id
          WHERE pe.timeframe=s.timeframe AND pe.body->>'symbol'=p_symbol
            AND pc.state='ready' AND pc.image_id IS NOT NULL AND pc.captured_at<=s.at
            AND pc.captured_at>extract(epoch FROM now())*1000-29*86400000::bigint
            AND EXISTS(SELECT 1 FROM jsonb_array_elements(s.zones) z
              WHERE z->>'zoneId'=pe.body->>'zoneId' AND z->>'side'=pe.body->>'side'
                AND (z->>'lower')::numeric=(pe.body->>'lower')::numeric
                AND (z->>'upper')::numeric=(pe.body->>'upper')::numeric)
        ) matching ORDER BY priority,captured_at DESC LIMIT 1
      ) c ON true WHERE s.at>0 AND s.symbol=p_symbol),
    'captureConnected',coalesce(cfg.capture_enabled AND cfg.capture_connected AND cfg.capture_checked_at>now()-interval '3 minutes',false),
    'sessionOpen',extract(isodow FROM now() AT TIME ZONE 'America/New_York')<6
      AND (now() AT TIME ZONE 'America/New_York')::time>='09:30'::time
      AND (now() AT TIME ZONE 'America/New_York')::time<'16:00'::time);
END;
$function$
;


REVOKE ALL ON FUNCTION public.pulse_feed_symbol(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pulse_feed_symbol(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.pulse_feed_spy() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.pulse_feed_symbol('AMEX:SPY'); $$;
CREATE OR REPLACE FUNCTION public.notify_pulse_zone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 -- Holding/heartbeat snapshots do not buzz repeatedly. No stale/replay alerts.
 IF coalesce(NEW.body->>'kind','') NOT IN ('observed','entered','broken')
   OR NEW.at < extract(epoch FROM now()-interval '2 minutes')*1000
   OR NEW.at > extract(epoch FROM now()+interval '30 seconds')*1000
   OR coalesce((NEW.body->>'afterHoursTest')::boolean,false) THEN RETURN NEW; END IF;
 INSERT INTO academy_notifications(user_id,type,title,body,link_path,source_pulse_id)
 SELECT p.user_id,'pulse_zone',split_part(NEW.body->>'symbol',':',2)||' Pulse · '||NEW.timeframe||'m',
   left(CASE NEW.body->>'kind' WHEN 'observed' THEN 'New ' WHEN 'entered' THEN 'Price entered ' WHEN 'returned' THEN 'Price returned to ' WHEN 'breached' THEN 'Price breached ' ELSE 'Confirmed break of ' END||coalesce(NEW.body->>'side','')||' zone · '||coalesce(NEW.body->>'lower','')||'–'||coalesce(NEW.body->>'upper',''),180),
   '/academy/community?tab=pulse'||CASE WHEN NEW.body->>'symbol'='NASDAQ:QQQ' THEN '&symbol=QQQ' ELSE '' END,NEW.id
 FROM profiles p LEFT JOIN user_preferences pref ON pref.user_id=p.user_id
 WHERE public.vault_access_for_user(p.user_id) AND coalesce(pref.notifications_enabled,true) AND coalesce(pref.notify_pulse,true)
 AND public.pulse_symbol_opted_in(NEW.body->>'symbol',pref.notify_pulse_spy,pref.notify_pulse_qqq)
 AND NOT EXISTS (SELECT 1 FROM academy_notifications prior JOIN pulse_spy_events old ON old.id=prior.source_pulse_id WHERE prior.user_id=p.user_id AND prior.type='pulse_zone' AND old.body->>'symbol'=NEW.body->>'symbol' AND old.body->>'zoneId'=NEW.body->>'zoneId' AND old.body->>'kind'=NEW.body->>'kind' AND old.timeframe=NEW.timeframe AND prior.created_at>now()-interval '5 minutes')
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_pulse_zone() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.vault_notification_deliverable(nid uuid,uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM academy_notifications n JOIN profiles p ON p.user_id=uid
 LEFT JOIN user_preferences pref ON pref.user_id=uid
 WHERE n.id=nid AND (n.user_id=uid OR n.user_id IS NULL)
 AND NOT coalesce(p.is_banned,false) AND coalesce(p.access_status,'') NOT IN ('banned','revoked')
 AND coalesce(pref.notifications_enabled,true)
 AND (NOT public.vault_paid_notification(n.type,n.link_path,n.title) OR public.vault_access_for_user(uid))
 AND CASE n.type
  WHEN 'chat_message' THEN coalesce(pref.notify_chat,true) AND EXISTS(
    SELECT 1 FROM academy_messages m WHERE m.id=n.source_message_id AND NOT coalesce(m.is_deleted,false)
      AND m.user_id<>uid AND m.room_slug IN ('trade-floor','wins-proof','questions','off-topic','daily-setups')
      AND n.link_path='/academy/room/'||m.room_slug
      AND (m.room_slug<>'daily-setups' OR public.vault_access_for_user(uid)))
  WHEN 'pulse_zone' THEN coalesce(pref.notify_pulse,true) AND EXISTS(
    SELECT 1 FROM pulse_spy_events e WHERE e.id=n.source_pulse_id AND n.link_path='/academy/community?tab=pulse'||CASE WHEN e.body->>'symbol'='NASDAQ:QQQ' THEN '&symbol=QQQ' ELSE '' END AND public.pulse_symbol_opted_in(e.body->>'symbol',pref.notify_pulse_spy,pref.notify_pulse_qqq) AND e.body->>'kind' IN ('observed','entered','broken') AND e.at>=extract(epoch FROM now()-interval '5 minutes')*1000)
  WHEN 'live_now' THEN coalesce(pref.notify_live_events,true) AND n.link_path='/academy/live'
  WHEN 'personal_reminder' THEN n.user_id=uid AND n.link_path='/academy/community?space=mine'
   AND n.created_at>now()-interval '30 minutes' AND EXISTS(SELECT 1 FROM member_spaces s WHERE s.user_id=uid AND s.enabled)
  ELSE false END);
$$;
REVOKE ALL ON FUNCTION public.vault_notification_deliverable(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.vault_notification_deliverable(uuid,uuid) TO service_role;



-- QQQ delivery/expiry monitoring only starts after operator activation.
CREATE TABLE public.pulse_qqq_incidents (LIKE public.pulse_spy_incidents INCLUDING ALL);
ALTER TABLE public.pulse_qqq_incidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pulse_qqq_incidents FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.pulse_qqq_incidents TO service_role;
CREATE FUNCTION public.pulse_qqq_watchdog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  state public.pulse_qqq_status%ROWTYPE; config public.pulse_spy_config%ROWTYPE;
  incident bigint; warning text; warning_kind text; ny timestamp:=now() AT TIME ZONE 'America/New_York';
BEGIN
  SELECT * INTO config FROM public.pulse_spy_config WHERE id;
  IF NOT config.enabled OR NOT config.qqq_enabled THEN RETURN; END IF;
  FOR state IN SELECT * FROM public.pulse_qqq_status LOOP
    warning:=NULL; warning_kind:=NULL;
    IF extract(isodow FROM ny)<6 AND ny::time>='09:33'::time AND ny::time<'16:00'::time
      AND now()>config.started_at+interval '3 minutes'
      AND (state.received_at IS NULL OR state.received_at<now()-interval '3 minutes') THEN
      warning:='QQQ '||state.timeframe||'m updates stopped. Check the TradingView alert.'; warning_kind:='delivery';
    ELSIF state.alert_expires_at<now()+interval '7 days' THEN
      warning:='QQQ '||state.timeframe||'m alert needs renewal before '||to_char(state.alert_expires_at,'Mon DD')||'.'; warning_kind:='expiry';
    END IF;
    IF warning IS NOT NULL THEN
      incident:=NULL;
      INSERT INTO public.pulse_qqq_incidents(timeframe,kind,message) VALUES(state.timeframe,warning_kind,warning)
        ON CONFLICT(timeframe,kind) WHERE resolved_at IS NULL DO NOTHING RETURNING id INTO incident;
      IF incident IS NOT NULL THEN
        INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
        SELECT DISTINCT ar.user_id,'announcement','QQQ Pulse needs attention',warning,'/academy/community?tab=pulse&symbol=QQQ'
          FROM public.academy_user_roles ar JOIN public.academy_roles r ON r.id=ar.role_id WHERE r.name='CEO';
      END IF;
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_qqq_watchdog() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_qqq_watchdog() TO service_role;
SELECT cron.schedule('vault-qqq-pulse-health','* * * * *','SELECT public.pulse_qqq_watchdog()');
