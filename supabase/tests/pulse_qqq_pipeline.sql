-- Run only inside a rollback transaction after the QQQ migration. No committed fixtures.
BEGIN;
DO $$
DECLARE token text:=repeat('a',64); before_spy jsonb; snap jsonb; post jsonb; result jsonb; ticket jsonb; rejected boolean:=false; now_ms bigint:=(extract(epoch FROM now())*1000)::bigint;
BEGIN
 PERFORM set_config('request.jwt.claim.sub','6f863212-a859-4812-9775-0b1388bc21b3',true);
 before_spy:=public.pulse_feed_symbol('AMEX:SPY');
 UPDATE public.pulse_spy_config SET enabled=true,qqq_enabled=true,capture_enabled=true,worker_hash=encode(sha256(convert_to(token,'UTF8')),'hex'),capture_lease=NULL,capture_lease_until=NULL WHERE id;
 snap:=jsonb_build_object('kind','snapshot','source','indicator','symbol','NASDAQ:QQQ','timeframe',5,'at',now_ms,'price',500,'zones',jsonb_build_array(jsonb_build_object('zoneId','QQQ:qa-zone','side','demand','lower',499,'upper',501)));
 post:=jsonb_build_object('id','QQQ:qa-event','zoneId','QQQ:qa-zone','kind','observed','source','indicator','symbol','NASDAQ:QQQ','timeframe',5,'at',now_ms,'price',500,'lower',499,'upper',501,'side','demand','afterHoursTest',true);
 result:=public.pulse_qqq_commit_snapshot(token,0,snap,jsonb_build_array(post));
 IF result->>'accepted'<>'true' THEN RAISE EXCEPTION 'QQQ commit failed'; END IF;
 IF public.pulse_feed_symbol('AMEX:SPY')->'quotes' IS DISTINCT FROM before_spy->'quotes' OR public.pulse_feed_symbol('AMEX:SPY')->'posts' IS DISTINCT FROM before_spy->'posts' THEN RAISE EXCEPTION 'SPY contaminated'; END IF;
 IF (public.pulse_feed_symbol('NASDAQ:QQQ')->'quotes'->'5'->>'price')::numeric<>500 OR jsonb_array_length(public.pulse_feed_symbol('NASDAQ:QQQ')->'posts')<>1 THEN RAISE EXCEPTION 'QQQ feed absent'; END IF;
 result:=public.pulse_qqq_commit_snapshot(token,0,snap,jsonb_build_array(post));
 IF result->>'accepted'<>'false' THEN RAISE EXCEPTION 'Duplicate accepted'; END IF;
 IF EXISTS(SELECT 1 FROM academy_notifications WHERE source_pulse_id='QQQ:qa-event') THEN RAISE EXCEPTION 'QA notified member'; END IF;
 ticket:=public.pulse_spy_capture_claim(token);
 IF ticket->'post'->>'symbol'<>'NASDAQ:QQQ' THEN RAISE EXCEPTION 'Wrong capture claim'; END IF;
 IF public.pulse_spy_capture_claim(token)->>'busy'<>'true' THEN RAISE EXCEPTION 'Parallel chart claim allowed'; END IF;
 BEGIN
 PERFORM public.pulse_spy_capture_finish(token,(ticket->>'lease')::uuid,'QQQ:qa-event',jsonb_build_object('ok',true,'symbol','AMEX:SPY','timeframe',5,'indicator','Vault Zone Pulse - SPY Live','capturedAt',now_ms,'imageId',gen_random_uuid()));
 EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Cross symbol image accepted'; END IF;
 RAISE NOTICE 'QQQ isolation, replay, notification suppression, global capture lease and wrong-image rejection passed';
END $$;
SELECT true AS pipeline_checks_passed;

ROLLBACK;
