-- Keep exact-zone saved charts independent of the bounded alert history.
-- No later or different-zone image is substituted; original timestamps remain intact.
CREATE OR REPLACE FUNCTION public.pulse_feed_spy()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE cfg public.pulse_spy_config%ROWTYPE; expiry text:=(floor(extract(epoch FROM now())/1800)::bigint*1800+3600)::text;
BEGIN
  IF NOT public.can_read_pulse(auth.uid()) THEN RAISE EXCEPTION 'Pulse requires active membership' USING ERRCODE='42501'; END IF;
  SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id;
  RETURN jsonb_build_object('symbol','AMEX:SPY',
    'posts',coalesce((SELECT jsonb_agg(e.body || CASE WHEN c.state='ready' AND cfg.capture_image_key IS NOT NULL THEN
      jsonb_build_object('capturedAt',c.captured_at,'captureContext',c.context,'chartUrl','https://vault-spy-pulse.iruben597.workers.dev/image/'||c.image_id||'?expires='||expiry||'&signature='||
        encode(extensions.hmac(convert_to(c.image_id||':'||expiry,'UTF8'),decode(cfg.capture_image_key,'hex'),'sha256'),'hex')) ELSE '{}'::jsonb END ORDER BY e.at,e.id)
      FROM (SELECT body,at,id FROM public.pulse_spy_events ORDER BY at DESC,id DESC LIMIT 100)e
      LEFT JOIN public.pulse_spy_captures c ON c.event_id=e.id),'[]'::jsonb),
    'receivedAt',(SELECT max(at) FROM public.pulse_spy_events),
    'indicatorAt',(SELECT jsonb_object_agg(timeframe,at) FROM public.pulse_spy_status),
    'quotes',(SELECT coalesce(jsonb_object_agg(s.timeframe,jsonb_build_object('price',s.price,'at',s.at,'zones',s.zones) ||
      CASE WHEN c.image_id IS NOT NULL AND cfg.capture_image_key IS NOT NULL THEN
        jsonb_build_object('chartCapturedAt',c.captured_at,'chartContext',c.context,'chartUrl','https://vault-spy-pulse.iruben597.workers.dev/image/'||c.image_id||'?expires='||expiry||'&signature='||
          encode(extensions.hmac(convert_to(c.image_id||':'||expiry,'UTF8'),decode(cfg.capture_image_key,'hex'),'sha256'),'hex')) ||
        CASE WHEN c.liquidity_image_id IS NOT NULL AND c.liquidity_captured_at IS NOT NULL AND abs(c.liquidity_captured_at-c.captured_at)<=90000 THEN
          jsonb_build_object('liquidityChart',jsonb_build_object('baseCapturedAt',c.captured_at,'capturedAt',c.liquidity_captured_at,
            'url','https://vault-spy-pulse.iruben597.workers.dev/image/'||c.liquidity_image_id||'?expires='||expiry||'&signature='||
              encode(extensions.hmac(convert_to(c.liquidity_image_id||':'||expiry,'UTF8'),decode(cfg.capture_image_key,'hex'),'sha256'),'hex')))
          ELSE '{}'::jsonb END ELSE '{}'::jsonb END),'{}'::jsonb)
      FROM public.pulse_spy_status s LEFT JOIN LATERAL (
        SELECT image_id,captured_at,liquidity_image_id,liquidity_captured_at,context FROM (
          SELECT sc.image_id,sc.captured_at,sc.liquidity_image_id,sc.liquidity_captured_at,'refresh'::text context,0 priority
          FROM public.pulse_spy_snapshot_charts sc
          WHERE sc.timeframe=s.timeframe AND sc.quote_at=s.at AND sc.expires_at>now()
          UNION ALL
          SELECT pc.image_id,pc.captured_at,NULL::uuid,NULL::bigint,'earlier'::text,1
          FROM public.pulse_spy_events pe JOIN public.pulse_spy_captures pc ON pc.event_id=pe.id
          WHERE pe.timeframe=s.timeframe AND pe.body->>'symbol'='AMEX:SPY'
            AND pc.state='ready' AND pc.image_id IS NOT NULL AND pc.captured_at<=s.at
            AND pc.captured_at>extract(epoch FROM now())*1000-29*86400000::bigint
            AND EXISTS(SELECT 1 FROM jsonb_array_elements(s.zones) z
              WHERE z->>'zoneId'=pe.body->>'zoneId' AND z->>'side'=pe.body->>'side'
                AND (z->>'lower')::numeric=(pe.body->>'lower')::numeric
                AND (z->>'upper')::numeric=(pe.body->>'upper')::numeric)
        ) matching ORDER BY priority,captured_at DESC LIMIT 1
      ) c ON true WHERE s.at>0),
    'captureConnected',coalesce(cfg.capture_enabled AND cfg.capture_connected AND cfg.capture_checked_at>now()-interval '3 minutes',false),
    'sessionOpen',extract(isodow FROM now() AT TIME ZONE 'America/New_York')<6
      AND (now() AT TIME ZONE 'America/New_York')::time>='09:30'::time
      AND (now() AT TIME ZONE 'America/New_York')::time<'16:00'::time);
END;
$function$
;

