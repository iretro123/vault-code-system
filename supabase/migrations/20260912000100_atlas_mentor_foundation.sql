-- Atlas-only additive schema. Not applied automatically by local preview.
CREATE TABLE public.atlas_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (length(body) BETWEEN 50 AND 5000),
  search_text tsvector GENERATED ALWAYS AS (to_tsvector('english',title || ' ' || body)) STORED,
  source_url text,
  market text NOT NULL DEFAULT 'general' CHECK (market IN ('general','stocks','options','futures','forex')),
  approved boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT approved OR (reviewed_at IS NOT NULL AND reviewer_id IS NOT NULL))
);
ALTER TABLE public.atlas_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atlas_documents FROM anon, authenticated;
GRANT ALL ON public.atlas_documents TO service_role;
CREATE INDEX atlas_documents_search ON public.atlas_documents USING gin(search_text);
CREATE FUNCTION public.search_atlas_documents(query_text text)
RETURNS TABLE(id uuid,title text,body text,version integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT d.id,d.title,d.body,d.version FROM public.atlas_documents d
  WHERE d.approved AND d.search_text @@ websearch_to_tsquery('english',left(query_text,2000))
  ORDER BY ts_rank(d.search_text,websearch_to_tsquery('english',left(query_text,2000))) DESC, d.id
  LIMIT 3;
$$;
REVOKE ALL ON FUNCTION public.search_atlas_documents(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_atlas_documents(text) TO service_role;

CREATE TABLE public.atlas_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minute_bucket timestamptz NOT NULL,
  requests integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, minute_bucket)
);
ALTER TABLE public.atlas_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atlas_usage FROM anon, authenticated;
GRANT ALL ON public.atlas_usage TO service_role;

CREATE OR REPLACE FUNCTION public.consume_atlas_request() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE uid uuid := auth.uid(); minute_start timestamptz := date_trunc('minute',now()); day_start timestamptz := date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'; recent integer; daily integer;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('atlas:' || uid::text, 0));
  SELECT coalesce(sum(requests) FILTER (WHERE minute_bucket = minute_start),0),coalesce(sum(requests),0) INTO recent,daily FROM public.atlas_usage WHERE user_id=uid AND minute_bucket>=day_start;
  IF recent>=10 OR daily>=100 THEN RETURN false; END IF;
  INSERT INTO public.atlas_usage(user_id,minute_bucket,requests) VALUES(uid,minute_start,1) ON CONFLICT(user_id,minute_bucket) DO UPDATE SET requests=atlas_usage.requests+1;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_atlas_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_atlas_request() TO authenticated;

CREATE TABLE public.atlas_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (length(question) BETWEEN 1 AND 1000),
  answer text NOT NULL CHECK (length(answer) BETWEEN 1 AND 6000),
  correction text NOT NULL CHECK (length(correction) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atlas_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atlas_feedback FROM anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.atlas_feedback TO authenticated;
GRANT ALL ON public.atlas_feedback TO service_role;
CREATE POLICY atlas_feedback_insert ON public.atlas_feedback FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND status='pending');
CREATE POLICY atlas_feedback_read ON public.atlas_feedback FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY atlas_feedback_delete ON public.atlas_feedback FOR DELETE TO authenticated USING(user_id=auth.uid());
-- No path automatically promotes feedback into approved teaching material.
