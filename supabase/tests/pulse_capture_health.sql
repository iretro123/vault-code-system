-- Transaction-only fixtures; never publish synthetic events or notifications.
BEGIN;
DO $$
DECLARE
 token text:=repeat('b',64); ticket uuid; result boolean; health jsonb;
 stamp bigint:=(extract(epoch FROM now())*1000)::bigint;
 event_key text; sym text;
BEGIN
 UPDATE public.pulse_spy_config SET enabled=true,capture_enabled=true,
   worker_hash=encode(sha256(convert_to(token,'UTF8')),'hex') WHERE id;
 FOREACH sym IN ARRAY ARRAY['NASDAQ:QQQ','AMEX:SPY'] LOOP
   event_key:='health-qa:'||sym;
   INSERT INTO public.pulse_spy_events(id,timeframe,at,body) VALUES(event_key,5,stamp,
     jsonb_build_object('id',event_key,'symbol',sym,'timeframe',5,'at',stamp,'kind','observed','source','indicator','side','supply','lower',100,'upper',101,'zoneId',event_key,'price',99,'afterHoursTest',true));
   ticket:=gen_random_uuid();
   UPDATE public.pulse_spy_config SET capture_lease=ticket,capture_lease_until=now()+interval '40 seconds' WHERE id;
   INSERT INTO public.pulse_spy_captures(event_id,state,attempts,lease,started_at)
     VALUES(event_key,'running',2,ticket,clock_timestamp())
     ON CONFLICT(event_id) DO UPDATE SET state='running',attempts=2,lease=ticket,started_at=clock_timestamp();
   IF sym='NASDAQ:QQQ' THEN
     result:=public.pulse_spy_capture_finish(token,ticket,event_key,jsonb_build_object('ok',false,'failure','chart-zone-mismatch','evidence',jsonb_build_object('expectedLower',100,'beforeLower',NULL,'secret','must not persist')));
     IF NOT result OR NOT (SELECT capture_connected FROM public.pulse_spy_config WHERE id) THEN RAISE EXCEPTION 'Content mismatch incorrectly marked browser disconnected'; END IF;
     IF (SELECT evidence FROM public.pulse_spy_captures WHERE event_id=event_key) IS DISTINCT FROM '{"expectedLower":100,"beforeLower":null}'::jsonb THEN RAISE EXCEPTION 'Unsafe or missing evidence'; END IF;
   ELSE
     result:=public.pulse_spy_capture_finish(token,ticket,event_key,jsonb_build_object('ok',true,'symbol',sym,'timeframe',5,'indicator','Vault Zone Pulse - SPY Live','capturedAt',stamp,'imageId',gen_random_uuid()));
     IF NOT result THEN RAISE EXCEPTION 'SPY fixture failed'; END IF;
   END IF;
 END LOOP;
 health:=public.pulse_capture_health('NASDAQ:QQQ');
 IF health->'5'->>'state'<>'attention' THEN RAISE EXCEPTION 'SPY success concealed QQQ failure'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pulse_qqq_incidents WHERE timeframe=5 AND kind='capture' AND resolved_at IS NULL) THEN RAISE EXCEPTION 'QQQ incident missing'; END IF;
 ticket:=gen_random_uuid();
 UPDATE public.pulse_spy_config SET capture_lease=ticket,capture_lease_until=now()+interval '40 seconds' WHERE id;
 PERFORM public.pulse_spy_capture_finish(token,ticket,NULL,'{"ok":true}'::jsonb);
 IF public.pulse_capture_health('NASDAQ:QQQ')->'5'->>'state'<>'attention' THEN RAISE EXCEPTION 'Idle success concealed QQQ failure'; END IF;
 -- Only a validated image from the same stream clears that stream's failure.
 ticket:=gen_random_uuid();
 UPDATE public.pulse_spy_config SET capture_lease=ticket,capture_lease_until=now()+interval '40 seconds' WHERE id;
 UPDATE public.pulse_spy_captures SET state='running',lease=ticket,started_at=clock_timestamp() WHERE event_id='health-qa:NASDAQ:QQQ';
 PERFORM public.pulse_spy_capture_finish(token,ticket,'health-qa:NASDAQ:QQQ',jsonb_build_object('ok',true,'symbol','NASDAQ:QQQ','timeframe',5,'indicator','Vault Zone Pulse - SPY & QQQ','capturedAt',stamp,'imageId',gen_random_uuid()));
 IF public.pulse_capture_health('NASDAQ:QQQ')->'5'->>'state'<>'ready' THEN RAISE EXCEPTION 'QQQ success did not clear its own failure'; END IF;
 IF EXISTS(SELECT 1 FROM pulse_qqq_incidents WHERE timeframe=5 AND kind='capture' AND resolved_at IS NULL) THEN RAISE EXCEPTION 'QQQ incident not resolved'; END IF;
END $$;
ROLLBACK;
SELECT true AS health_isolation_checks_passed;
