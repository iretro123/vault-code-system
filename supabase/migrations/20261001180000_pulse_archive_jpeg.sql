-- Keep older genuine JPEG originals byte-for-byte; new captures remain PNG.
ALTER TABLE public.pulse_image_archive ADD COLUMN content_type text NOT NULL DEFAULT 'image/png' CHECK(content_type IN ('image/png','image/jpeg'));

CREATE OR REPLACE FUNCTION public.pulse_image_archive_put(p_token text,p_image_id uuid,p_png text,p_sha256 text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE image_bytes bytea; mime text; c public.pulse_spy_captures%ROWTYPE; e public.pulse_spy_events%ROWTYPE;
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF length(p_png)>10666668 OR p_png IS NULL THEN RAISE EXCEPTION 'Invalid archive image'; END IF;
  image_bytes:=decode(p_png,'base64');
  -- p_png/png retain their initial RPC/column names; bytes are never converted.
  mime:=CASE WHEN substring(image_bytes FROM 1 FOR 8)=decode('89504e470d0a1a0a','hex') THEN 'image/png'
    WHEN substring(image_bytes FROM 1 FOR 3)=decode('ffd8ff','hex') AND substring(image_bytes FROM octet_length(image_bytes)-1)=decode('ffd9','hex') THEN 'image/jpeg' END;
  IF octet_length(image_bytes) NOT BETWEEN 10000 AND 8000000
    OR mime IS NULL
    OR encode(extensions.digest(image_bytes,'sha256'),'hex') IS DISTINCT FROM p_sha256 THEN
    RAISE EXCEPTION 'Invalid archive image';
  END IF;
  -- Identical retries are safe, but an existing original can never be replaced.
  IF EXISTS(SELECT 1 FROM public.pulse_image_archive WHERE image_id=p_image_id) THEN
    IF NOT EXISTS(SELECT 1 FROM public.pulse_image_archive WHERE image_id=p_image_id AND sha256=p_sha256) THEN
      RAISE EXCEPTION 'Archive identity conflict';
    END IF;
    RETURN true;
  END IF;
  SELECT * INTO STRICT c FROM public.pulse_spy_captures WHERE image_id=p_image_id AND state='ready';
  SELECT * INTO STRICT e FROM public.pulse_spy_events WHERE id=c.event_id;
  INSERT INTO public.pulse_image_archive(image_id,event_id,captured_at,provenance,png,sha256,content_type)
  VALUES(p_image_id,e.id,c.captured_at,jsonb_build_object('symbol',e.body->>'symbol','timeframe',e.timeframe,
    'zoneId',e.body->>'zoneId','side',e.body->>'side','lower',e.body->'lower','upper',e.body->'upper',
    'eventAt',e.at,'captureContext',c.context),image_bytes,p_sha256,mime)
  ON CONFLICT(image_id) DO NOTHING;
  RETURN EXISTS(SELECT 1 FROM public.pulse_image_archive WHERE image_id=p_image_id AND sha256=p_sha256);
END;
$$;

CREATE OR REPLACE FUNCTION public.pulse_image_archive_get(p_token text,p_image_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  RETURN (SELECT jsonb_build_object('png',encode(png,'base64'),'sha256',sha256,'contentType',content_type) FROM public.pulse_image_archive WHERE image_id=p_image_id);
END;
$$;
