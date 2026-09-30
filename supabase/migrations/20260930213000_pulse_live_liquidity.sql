-- Independent 5m/15m captures. Never join a current image onto a historical event.
CREATE TABLE public.pulse_liquidity_state (
 timeframe integer PRIMARY KEY CHECK(timeframe IN(5,15)),
 enabled boolean NOT NULL DEFAULT false,
 image_id uuid, captured_at bigint, quote_at bigint,
 above numeric, below numeric, checked_at timestamptz,
 failure text, lease uuid, attempted_at timestamptz,
 CHECK(above IS NULL OR above>0), CHECK(below IS NULL OR below>0)
);
INSERT INTO public.pulse_liquidity_state(timeframe) VALUES(5),(15);
ALTER TABLE public.pulse_liquidity_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pulse_liquidity_state FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.pulse_liquidity_state TO service_role;

CREATE FUNCTION public.pulse_liquidity_claim(p_token text,p_timeframe integer DEFAULT NULL,p_force boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.pulse_spy_config%ROWTYPE; q public.pulse_spy_status%ROWTYPE; tf integer; ticket uuid:=gen_random_uuid();
BEGIN
 IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 IF p_timeframe IS NOT NULL AND p_timeframe NOT IN(5,15) THEN RAISE EXCEPTION 'Unsupported timeframe'; END IF;
 SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id FOR UPDATE;
 IF NOT cfg.capture_enabled OR cfg.capture_lease_until>now() OR EXISTS(SELECT 1 FROM public.pulse_spy_captures WHERE state IN('queued','running')) THEN RETURN jsonb_build_object('busy',true); END IF;
 IF extract(isodow FROM now() AT TIME ZONE 'America/New_York')>5 OR (now() AT TIME ZONE 'America/New_York')::time<'09:30' OR (now() AT TIME ZONE 'America/New_York')::time>='16:00' THEN RETURN NULL; END IF;
 SELECT l.timeframe INTO tf FROM public.pulse_liquidity_state l JOIN public.pulse_spy_status s USING(timeframe)
 WHERE (l.enabled OR p_force) AND (p_timeframe IS NULL OR l.timeframe=p_timeframe)
 AND (p_force OR l.attempted_at IS NULL OR l.attempted_at<now()-interval '110 seconds')
 AND s.at BETWEEN extract(epoch FROM now())*1000-60000 AND extract(epoch FROM now())*1000
 ORDER BY l.attempted_at NULLS FIRST LIMIT 1;
 IF tf IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO STRICT q FROM public.pulse_spy_status WHERE timeframe=tf;
 UPDATE public.pulse_spy_config SET capture_lease=ticket,capture_lease_until=now()+interval '40 seconds' WHERE id;
 UPDATE public.pulse_liquidity_state SET lease=ticket,attempted_at=now() WHERE timeframe=tf;
 RETURN jsonb_build_object('lease',ticket,'timeframe',tf,'quoteAt',q.at,'price',q.price);
END; $$;

CREATE FUNCTION public.pulse_liquidity_finish(p_token text,p_lease uuid,p_timeframe integer,p_result jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.pulse_spy_config%ROWTYPE; stamp bigint; quote bigint;
BEGIN
 IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id FOR UPDATE;
 IF p_timeframe NOT IN(5,15) OR cfg.capture_lease IS DISTINCT FROM p_lease OR cfg.capture_lease_until<now()
 OR NOT EXISTS(SELECT 1 FROM public.pulse_liquidity_state WHERE timeframe=p_timeframe AND lease=p_lease) THEN RETURN false; END IF;
 IF coalesce((p_result->>'ok')::boolean,false) THEN
  stamp:=(p_result->>'capturedAt')::bigint; quote:=(p_result->>'quoteAt')::bigint;
  IF stamp IS NULL OR quote IS NULL OR stamp<quote OR stamp>quote+90000 OR stamp<extract(epoch FROM now())*1000-35000 OR stamp>extract(epoch FROM now())*1000+1000 OR (p_result->>'timeframe')::integer IS DISTINCT FROM p_timeframe OR p_result->>'imageId' IS NULL THEN RAISE EXCEPTION 'Invalid liquidity provenance'; END IF;
  UPDATE public.pulse_liquidity_state SET image_id=(p_result->>'imageId')::uuid,captured_at=stamp,quote_at=quote,above=(p_result->>'above')::numeric,below=(p_result->>'below')::numeric,checked_at=now(),failure=NULL,lease=NULL WHERE timeframe=p_timeframe;
 ELSE
  UPDATE public.pulse_liquidity_state SET failure=CASE WHEN p_result->>'failure' ~ '^liquidity-[a-z-]+$' THEN left(p_result->>'failure',80) ELSE 'liquidity-capture-unavailable' END,checked_at=now(),lease=NULL WHERE timeframe=p_timeframe;
 END IF;
 UPDATE public.pulse_spy_config SET capture_lease=NULL,capture_lease_until=NULL WHERE id;
 RETURN true;
END; $$;

CREATE FUNCTION public.pulse_liquidity_feed()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.pulse_spy_config%ROWTYPE; expiry text:=(floor(extract(epoch FROM now())/1800)::bigint*1800+3600)::text;
BEGIN
 IF NOT coalesce(public.can_read_pulse(auth.uid()),false) THEN RAISE EXCEPTION 'Pulse requires active membership' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id;
 RETURN coalesce((SELECT jsonb_object_agg(timeframe,jsonb_build_object('capturedAt',captured_at,'quoteAt',quote_at,'above',above,'below',below,'available',failure IS NULL AND captured_at>extract(epoch FROM now())*1000-180000,'chartUrl',CASE WHEN image_id IS NOT NULL AND captured_at>extract(epoch FROM now())*1000-3600000 AND cfg.capture_image_key IS NOT NULL THEN 'https://vault-spy-pulse.iruben597.workers.dev/image/'||image_id||'?expires='||expiry||'&signature='||encode(extensions.hmac(convert_to(image_id||':'||expiry,'UTF8'),decode(cfg.capture_image_key,'hex'),'sha256'),'hex') ELSE NULL END)) FROM public.pulse_liquidity_state WHERE enabled),'{}'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.pulse_liquidity_claim(text,integer,boolean),public.pulse_liquidity_finish(text,uuid,integer,jsonb),public.pulse_liquidity_feed() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_liquidity_claim(text,integer,boolean),public.pulse_liquidity_finish(text,uuid,integer,jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.pulse_liquidity_feed() TO authenticated;
