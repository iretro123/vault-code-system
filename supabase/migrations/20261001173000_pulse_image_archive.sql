-- A second, private copy outside Cloudflare. Only genuine, registered event
-- captures can enter this archive. Never stores session cookies or credentials.
CREATE TABLE public.pulse_image_archive (
  image_id uuid PRIMARY KEY,
  event_id text NOT NULL REFERENCES public.pulse_spy_events(id),
  captured_at bigint NOT NULL,
  provenance jsonb NOT NULL,
  png bytea NOT NULL CHECK(octet_length(png) BETWEEN 10000 AND 8000000),
  sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
  archived_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pulse_image_archive_checks (
  image_id uuid PRIMARY KEY,
  checked_at timestamptz NOT NULL DEFAULT now(),
  retry_at timestamptz NOT NULL DEFAULT now(),
  failure text
);
ALTER TABLE public.pulse_image_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_image_archive_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pulse_image_archive,public.pulse_image_archive_checks FROM anon,authenticated;
GRANT ALL ON public.pulse_image_archive,public.pulse_image_archive_checks TO service_role;

CREATE OR REPLACE FUNCTION public.pulse_image_archive_pending(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('imageId',image_id)) FROM (
    SELECT c.image_id FROM public.pulse_spy_captures c
    LEFT JOIN public.pulse_image_archive a ON a.image_id=c.image_id
    LEFT JOIN public.pulse_image_archive_checks k ON k.image_id=c.image_id
    WHERE c.state='ready' AND c.image_id IS NOT NULL AND a.image_id IS NULL
      AND (k.retry_at IS NULL OR k.retry_at<=now())
    ORDER BY c.captured_at DESC LIMIT 10
  ) pending),'[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.pulse_image_archive_put(p_token text,p_image_id uuid,p_png text,p_sha256 text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE image_bytes bytea; c public.pulse_spy_captures%ROWTYPE; e public.pulse_spy_events%ROWTYPE;
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF length(p_png)>10666668 OR p_png IS NULL THEN RAISE EXCEPTION 'Invalid archive image'; END IF;
  image_bytes:=decode(p_png,'base64');
  IF octet_length(image_bytes) NOT BETWEEN 10000 AND 8000000
    OR substring(image_bytes FROM 1 FOR 8)<>decode('89504e470d0a1a0a','hex')
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
  INSERT INTO public.pulse_image_archive(image_id,event_id,captured_at,provenance,png,sha256)
  VALUES(p_image_id,e.id,c.captured_at,jsonb_build_object('symbol',e.body->>'symbol','timeframe',e.timeframe,
    'zoneId',e.body->>'zoneId','side',e.body->>'side','lower',e.body->'lower','upper',e.body->'upper',
    'eventAt',e.at,'captureContext',c.context),image_bytes,p_sha256)
  ON CONFLICT(image_id) DO NOTHING;
  RETURN EXISTS(SELECT 1 FROM public.pulse_image_archive WHERE image_id=p_image_id AND sha256=p_sha256);
END;
$$;

CREATE OR REPLACE FUNCTION public.pulse_image_archive_retry(p_token text,p_image_id uuid,p_failure text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.pulse_spy_captures WHERE image_id=p_image_id AND state='ready') THEN RETURN false; END IF;
  INSERT INTO public.pulse_image_archive_checks(image_id,checked_at,retry_at,failure)
  VALUES(p_image_id,now(),now()+interval '5 minutes',CASE WHEN p_failure IN ('primary-image-unavailable','archive-write-unavailable','archive-image-invalid') THEN p_failure ELSE 'archive-write-unavailable' END)
  ON CONFLICT(image_id) DO UPDATE SET checked_at=excluded.checked_at,retry_at=excluded.retry_at,failure=excluded.failure;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.pulse_image_archive_get(p_token text,p_image_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  RETURN (SELECT jsonb_build_object('png',encode(png,'base64'),'sha256',sha256) FROM public.pulse_image_archive WHERE image_id=p_image_id);
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_image_archive_pending(text),public.pulse_image_archive_put(text,uuid,text,text),public.pulse_image_archive_retry(text,uuid,text),public.pulse_image_archive_get(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_image_archive_pending(text),public.pulse_image_archive_put(text,uuid,text,text),public.pulse_image_archive_retry(text,uuid,text),public.pulse_image_archive_get(text,uuid) TO anon,service_role;
