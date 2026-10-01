-- Transaction-only fixture; no event, notification or config change survives.
BEGIN;
DO $$
DECLARE stamp bigint:=(extract(epoch FROM now())*1000)::bigint;
 token text:=repeat('e',64); result jsonb;
BEGIN
 UPDATE public.pulse_spy_config SET capture_enabled=false,worker_hash=encode(sha256(convert_to(token,'UTF8')),'hex') WHERE id;
 INSERT INTO public.pulse_spy_events(id,timeframe,at,body) VALUES('paused-capture-qa',5,stamp,
  jsonb_build_object('id','paused-capture-qa','symbol','NASDAQ:QQQ','timeframe',5,'at',stamp,'kind','observed','side','demand','lower',100,'upper',101,'zoneId','paused-capture-qa','afterHoursTest',true));
 IF NOT EXISTS(SELECT 1 FROM public.pulse_spy_captures WHERE event_id='paused-capture-qa' AND state='queued') THEN RAISE EXCEPTION 'Pause lost capture work'; END IF;
 result:=public.pulse_spy_capture_claim(token);
 IF result IS NOT NULL THEN RAISE EXCEPTION 'Paused capture executed'; END IF;
 INSERT INTO public.pulse_spy_events(id,timeframe,at,body) VALUES('expired-capture-qa',5,stamp-120000,
  jsonb_build_object('id','expired-capture-qa','symbol','NASDAQ:QQQ','timeframe',5,'at',stamp-120000,'kind','observed','side','demand','lower',100,'upper',101,'zoneId','expired-capture-qa','afterHoursTest',true));
 IF EXISTS(SELECT 1 FROM public.pulse_spy_captures WHERE event_id='expired-capture-qa') THEN RAISE EXCEPTION 'Expired replay queued as fresh'; END IF;
END $$;
ROLLBACK;
SELECT true AS paused_queue_checks_passed;
