-- Rollback-only regression; afterHoursTest prevents notification fanout.
BEGIN;
DO $$
DECLARE stamp bigint:=(extract(epoch FROM now())*1000)::bigint+1000;
BEGIN
 INSERT INTO public.pulse_spy_events(id,timeframe,at,body)
 SELECT 'health-order-qa:'||n,5,stamp+n,jsonb_build_object('symbol','NASDAQ:QQQ','kind','observed','afterHoursTest',true,'timeframe',5,'at',stamp+n,'lower',100,'upper',101,'side','supply','zoneId','health-order-qa:'||n)
 FROM generate_series(1,2) n;
 INSERT INTO public.pulse_spy_captures(event_id,state,failure,started_at,captured_at)
 VALUES ('health-order-qa:1','unavailable','chart-zone-mismatch',now()+interval '2 minutes',NULL),
 ('health-order-qa:2','ready',NULL,now(),stamp+2)
 ON CONFLICT(event_id) DO UPDATE SET state=excluded.state,failure=excluded.failure,started_at=excluded.started_at,captured_at=excluded.captured_at;
 IF public.pulse_capture_health('NASDAQ:QQQ')->'5'->>'state'<>'ready' THEN
 RAISE EXCEPTION 'Historical retry overrode newer verified event'; END IF;
 UPDATE public.pulse_spy_captures SET state='unavailable',failure='chart-zone-mismatch' WHERE event_id='health-order-qa:2';
 IF public.pulse_capture_health('NASDAQ:QQQ')->'5'->>'state'<>'attention' THEN
 RAISE EXCEPTION 'Newest event failure was concealed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pulse_spy_captures WHERE event_id='health-order-qa:1' AND failure='chart-zone-mismatch') THEN
 RAISE EXCEPTION 'Historical failure was deleted'; END IF;
END $$;
ROLLBACK;
SELECT true AS event_order_checks_passed;
