ALTER TABLE public.pulse_spy_captures ADD COLUMN evidence jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Per-symbol/timeframe image health. Idle connection checks never alter it.
CREATE OR REPLACE FUNCTION public.pulse_capture_health(p_symbol text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_object_agg(tf,jsonb_build_object(
    'state',CASE WHEN c.failure IS NOT NULL THEN 'attention' WHEN c.state='ready' THEN 'ready' ELSE 'unverified' END,
    'failure',c.failure,'capturedAt',c.captured_at,
    'checkedAt',floor(extract(epoch FROM coalesce(c.started_at,c.created_at))*1000)))
  FROM (VALUES (5),(15)) frames(tf)
  LEFT JOIN LATERAL (
    SELECT pc.state,pc.failure,pc.captured_at,pc.started_at,pe.created_at
    FROM public.pulse_spy_captures pc JOIN public.pulse_spy_events pe ON pe.id=pc.event_id
    WHERE pe.timeframe=tf AND pe.body->>'symbol'=p_symbol
      AND (pc.failure IS NOT NULL OR pc.state='ready')
    ORDER BY coalesce(pc.started_at,pe.created_at) DESC,pe.at DESC LIMIT 1
  ) c ON true;
$$;
REVOKE ALL ON FUNCTION public.pulse_capture_health(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_capture_health(text) TO service_role;

CREATE OR REPLACE FUNCTION public.pulse_spy_capture_finish(p_token text,p_lease uuid,p_event_id text,p_result jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  cfg public.pulse_spy_config%ROWTYPE; job public.pulse_spy_captures%ROWTYPE; event public.pulse_spy_events%ROWTYPE;
  capture_time bigint; issue bigint; ok boolean:=coalesce((p_result->>'ok')::boolean,false);
  transport_ok boolean;
  v_failure text:=left(coalesce(p_result->>'failure','capture-unavailable'),100);
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id FOR UPDATE;
  IF cfg.capture_lease IS DISTINCT FROM p_lease OR cfg.capture_lease_until<now() THEN RETURN false; END IF;
  IF p_event_id IS NOT NULL THEN
    SELECT * INTO STRICT job FROM public.pulse_spy_captures WHERE event_id=p_event_id FOR UPDATE;
    SELECT * INTO STRICT event FROM public.pulse_spy_events WHERE id=p_event_id;
    IF job.lease IS DISTINCT FROM p_lease THEN RETURN false; END IF;
    UPDATE public.pulse_spy_captures SET evidence=coalesce((
      SELECT jsonb_object_agg(key,value) FROM jsonb_each(
        CASE WHEN jsonb_typeof(p_result->'evidence')='object' THEN p_result->'evidence' ELSE '{}'::jsonb END)
      WHERE key IN ('expectedLower','expectedUpper','beforeLower','beforeUpper','afterLower','afterUpper')
        AND (jsonb_typeof(value)='number' OR value='null'::jsonb)
    ),'{}'::jsonb) WHERE event_id=p_event_id;
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
  transport_ok := ok OR v_failure IN ('chart-zone-mismatch','chart-zone-data-unavailable','chart-price-mismatch','chart-crop-unavailable','chart-image-invalid','pulse-indicator-missing','wrong-chart-timeframe');
  UPDATE public.pulse_spy_config SET capture_connected=CASE WHEN v_failure IN ('capture-window-expired','capture-budget-exceeded') AND NOT ok THEN cfg.capture_connected ELSE transport_ok END,capture_checked_at=now(),capture_lease=NULL,capture_lease_until=NULL WHERE id;
  -- Browser connectivity and each market's image correctness are independent.
  -- An idle probe or a successful SPY image cannot resolve a QQQ image incident.
  IF transport_ok THEN
    UPDATE public.pulse_spy_incidents SET resolved_at=now() WHERE timeframe=0 AND kind='capture' AND resolved_at IS NULL;
  END IF;
  IF p_event_id IS NOT NULL THEN
    IF event.body->>'symbol'='NASDAQ:QQQ' THEN
      IF ok THEN
        UPDATE public.pulse_qqq_incidents SET resolved_at=now() WHERE timeframe=event.timeframe AND kind='capture' AND resolved_at IS NULL;
      ELSE
        INSERT INTO public.pulse_qqq_incidents(timeframe,kind,message)
          VALUES(event.timeframe,'capture','QQQ chart capture needs attention: '||v_failure)
          ON CONFLICT(timeframe,kind) WHERE resolved_at IS NULL DO NOTHING RETURNING id INTO issue;
      END IF;
    ELSE
      IF ok THEN
        UPDATE public.pulse_spy_incidents SET resolved_at=now() WHERE timeframe=event.timeframe AND kind='capture' AND resolved_at IS NULL;
      ELSE
        INSERT INTO public.pulse_spy_incidents(timeframe,kind,message)
          VALUES(event.timeframe,'capture','SPY chart capture needs attention: '||v_failure)
          ON CONFLICT(timeframe,kind) WHERE resolved_at IS NULL DO NOTHING RETURNING id INTO issue;
      END IF;
    END IF;
  ELSIF NOT transport_ok THEN
    INSERT INTO public.pulse_spy_incidents(timeframe,kind,message) VALUES(0,'capture','Hosted chart capture needs attention: '||v_failure)
      ON CONFLICT(timeframe,kind) WHERE resolved_at IS NULL DO NOTHING RETURNING id INTO issue;
  END IF;
  IF issue IS NOT NULL THEN
    INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
      SELECT DISTINCT ar.user_id,'announcement','Pulse chart capture needs attention',
        CASE WHEN p_event_id IS NULL THEN 'Hosted chart checks failed.' ELSE split_part(event.body->>'symbol',':',2)||' '||event.timeframe||'m chart capture failed validation.' END,
        '/academy/community?tab=pulse'||CASE WHEN event.body->>'symbol'='NASDAQ:QQQ' THEN '&symbol=QQQ' ELSE '' END
      FROM public.academy_user_roles ar JOIN public.academy_roles r ON r.id=ar.role_id WHERE r.name='CEO';
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
    'captureHealth',public.pulse_capture_health(p_symbol),
    'captureConnected',coalesce(cfg.capture_enabled AND cfg.capture_connected AND cfg.capture_checked_at>now()-interval '3 minutes',false),
    'sessionOpen',extract(isodow FROM now() AT TIME ZONE 'America/New_York')<6
      AND (now() AT TIME ZONE 'America/New_York')::time>='09:30'::time
      AND (now() AT TIME ZONE 'America/New_York')::time<'16:00'::time);
END;
$function$
;


