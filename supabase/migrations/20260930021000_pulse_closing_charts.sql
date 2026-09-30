-- Separate later chart views from event-time captures. Exact quote timestamp
-- matching prevents yesterday's image from being shown with today's zones.
CREATE TABLE public.pulse_spy_snapshot_charts (
 timeframe integer PRIMARY KEY CHECK(timeframe IN (5,15)),
 quote_at bigint NOT NULL,
 image_id uuid NOT NULL,
 captured_at bigint NOT NULL CHECK(captured_at >= quote_at),
 expires_at timestamptz NOT NULL
);
ALTER TABLE public.pulse_spy_snapshot_charts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pulse_spy_snapshot_charts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.pulse_spy_snapshot_charts TO service_role;

CREATE OR REPLACE FUNCTION public.pulse_feed_spy()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
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
        jsonb_build_object('chartCapturedAt',c.captured_at,'chartUrl','https://vault-spy-pulse.iruben597.workers.dev/image/'||c.image_id||'?expires='||expiry||'&signature='||
          encode(extensions.hmac(convert_to(c.image_id||':'||expiry,'UTF8'),decode(cfg.capture_image_key,'hex'),'sha256'),'hex')) ELSE '{}'::jsonb END),'{}'::jsonb)
      FROM public.pulse_spy_status s LEFT JOIN public.pulse_spy_snapshot_charts c ON c.timeframe=s.timeframe AND c.quote_at=s.at AND c.expires_at>now() WHERE s.at>0),
    'captureConnected',coalesce(cfg.capture_enabled AND cfg.capture_connected AND cfg.capture_checked_at>now()-interval '3 minutes',false),
    'sessionOpen',extract(isodow FROM now() AT TIME ZONE 'America/New_York')<6
      AND (now() AT TIME ZONE 'America/New_York')::time>='09:00'::time
      AND (now() AT TIME ZONE 'America/New_York')::time<'16:00'::time);
END;
$$;
