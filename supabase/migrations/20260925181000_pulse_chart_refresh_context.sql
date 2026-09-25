-- A manually captured later view is explicitly distinguished from an event-time
-- screenshot. The automated capture RPC retains its strict 90-second limit.
ALTER TABLE public.pulse_spy_captures
  ADD COLUMN context text NOT NULL DEFAULT 'event' CHECK(context IN ('event','refresh'));

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
    'quotes',(SELECT coalesce(jsonb_object_agg(timeframe,jsonb_build_object('price',price,'at',at,'zones',zones)),'{}'::jsonb) FROM public.pulse_spy_status WHERE at>0),
    'captureConnected',coalesce(cfg.capture_enabled AND cfg.capture_connected AND cfg.capture_checked_at>now()-interval '3 minutes',false),
    'sessionOpen',extract(isodow FROM now() AT TIME ZONE 'America/New_York')<6
      AND (now() AT TIME ZONE 'America/New_York')::time>='09:00'::time
      AND (now() AT TIME ZONE 'America/New_York')::time<'16:00'::time);
END;
$$;
