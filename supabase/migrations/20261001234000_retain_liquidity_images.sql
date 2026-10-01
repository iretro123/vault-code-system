-- Only captures written without a TTL qualify for durable links.
ALTER TABLE public.pulse_market_liquidity_state ADD COLUMN retained boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.pulse_market_liquidity_finish(p_token text,p_lease uuid,p_timeframe integer,p_result jsonb,p_symbol text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.pulse_spy_config%ROWTYPE; stamp bigint; quote bigint;
BEGIN
 IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id FOR UPDATE;
 IF p_timeframe NOT IN(5,15) OR cfg.capture_lease IS DISTINCT FROM p_lease OR cfg.capture_lease_until<now()
 OR NOT EXISTS(SELECT 1 FROM public.pulse_market_liquidity_state WHERE symbol=p_symbol AND timeframe=p_timeframe AND lease=p_lease) THEN RETURN false; END IF;
 IF coalesce((p_result->>'ok')::boolean,false) THEN
  stamp:=(p_result->>'capturedAt')::bigint; quote:=(p_result->>'quoteAt')::bigint;
  IF p_result->>'symbol' IS DISTINCT FROM p_symbol OR stamp IS NULL OR quote IS NULL OR stamp<quote OR stamp>quote+90000 OR stamp<extract(epoch FROM now())*1000-35000 OR stamp>extract(epoch FROM now())*1000+1000 OR (p_result->>'timeframe')::integer IS DISTINCT FROM p_timeframe OR p_result->>'imageId' IS NULL THEN RAISE EXCEPTION 'Invalid liquidity provenance'; END IF;
  UPDATE public.pulse_market_liquidity_state SET retained=true,image_id=(p_result->>'imageId')::uuid,captured_at=stamp,quote_at=quote,above=(p_result->>'above')::numeric,below=(p_result->>'below')::numeric,checked_at=now(),failure=NULL,lease=NULL WHERE symbol=p_symbol AND timeframe=p_timeframe;
 ELSE
  UPDATE public.pulse_market_liquidity_state SET failure=CASE WHEN p_result->>'failure' ~ '^liquidity-[a-z-]+$' THEN left(p_result->>'failure',80) ELSE 'liquidity-capture-unavailable' END,checked_at=now(),lease=NULL WHERE symbol=p_symbol AND timeframe=p_timeframe;
 END IF;
 UPDATE public.pulse_spy_config SET capture_lease=NULL,capture_lease_until=NULL WHERE id;
 RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.pulse_market_liquidity_feed(p_symbol text DEFAULT 'AMEX:SPY')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.pulse_spy_config%ROWTYPE; expiry text:=(floor(extract(epoch FROM now())/1800)::bigint*1800+3600)::text;
BEGIN
 IF NOT coalesce(public.can_read_pulse(auth.uid()),false) THEN RAISE EXCEPTION 'Pulse requires active membership' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id;
 RETURN coalesce((SELECT jsonb_object_agg(timeframe,jsonb_build_object('capturedAt',captured_at,'quoteAt',quote_at,'above',above,'below',below,'available',failure IS NULL AND captured_at>extract(epoch FROM now())*1000-180000,'chartUrl',CASE WHEN image_id IS NOT NULL AND (retained OR captured_at>extract(epoch FROM now())*1000-3600000) AND cfg.capture_image_key IS NOT NULL THEN 'https://vault-spy-pulse.iruben597.workers.dev/image/'||image_id||'?expires='||expiry||'&signature='||encode(extensions.hmac(convert_to(image_id||':'||expiry,'UTF8'),decode(cfg.capture_image_key,'hex'),'sha256'),'hex') ELSE NULL END)) FROM public.pulse_market_liquidity_state WHERE enabled AND symbol=p_symbol),'{}'::jsonb);
END; $$;

NOTIFY pgrst, 'reload schema';
