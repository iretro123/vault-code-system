-- Entire fixture is rolled back; no production events, images or notifications.
BEGIN;
DO $$
DECLARE token text:=repeat('d',64); image uuid:=gen_random_uuid(); bytes bytea;
 digest text; stamp bigint:=(extract(epoch FROM now())*1000)::bigint; result jsonb;
BEGIN
 UPDATE public.pulse_spy_config SET worker_hash=encode(sha256(convert_to(token,'UTF8')),'hex') WHERE id;
 bytes:=decode('89504e470d0a1a0a'||repeat('00',12000),'hex');
 digest:=encode(extensions.digest(bytes,'sha256'),'hex');
 INSERT INTO public.pulse_spy_events(id,timeframe,at,body) VALUES('archive-qa',5,stamp,
   jsonb_build_object('id','archive-qa','symbol','NASDAQ:QQQ','timeframe',5,'at',stamp,'kind','observed','side','demand','lower',100,'upper',101,'zoneId','archive-qa','afterHoursTest',true));
 INSERT INTO public.pulse_spy_captures(event_id,state,image_id,captured_at) VALUES('archive-qa','ready',image,stamp)
 ON CONFLICT(event_id) DO UPDATE SET state='ready',image_id=image,captured_at=stamp;
 IF NOT public.pulse_image_archive_put(token,image,encode(bytes,'base64'),digest) THEN RAISE EXCEPTION 'Archive write failed'; END IF;
 IF NOT public.pulse_image_archive_put(token,image,encode(bytes,'base64'),digest) THEN RAISE EXCEPTION 'Archive retry failed'; END IF;
 result:=public.pulse_image_archive_get(token,image);
 IF decode(result->>'png','base64')<>bytes OR result->>'sha256'<>digest THEN RAISE EXCEPTION 'Recovery bytes changed'; END IF;
 BEGIN
   PERFORM public.pulse_image_archive_get('wrong',image);
   RAISE EXCEPTION 'Unauthorized archive read';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   PERFORM public.pulse_image_archive_put(token,gen_random_uuid(),encode(bytes,'base64'),digest);
   RAISE EXCEPTION 'Unregistered image accepted';
 EXCEPTION WHEN no_data_found THEN NULL; END;
 BEGIN
   PERFORM public.pulse_image_archive_put(token,image,encode(bytes,'base64'),repeat('0',64));
   RAISE EXCEPTION 'Corrupt checksum accepted';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'Invalid archive image' THEN RAISE; END IF;
 END;
 IF has_table_privilege('anon','public.pulse_image_archive','SELECT') OR has_table_privilege('authenticated','public.pulse_image_archive','SELECT') THEN RAISE EXCEPTION 'Archive is publicly readable'; END IF;
 DELETE FROM public.pulse_spy_events WHERE id='archive-qa';
 IF public.pulse_image_archive_get(token,image)->>'sha256'<>digest THEN RAISE EXCEPTION 'Feed retention lost the independent original'; END IF;
END $$;
ROLLBACK;
SELECT true AS archive_checks_passed;
