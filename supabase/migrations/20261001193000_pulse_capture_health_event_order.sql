-- An old job retry must not supersede a newer verified market event.
-- Keep failures stored; only current stream health follows market event order.
CREATE OR REPLACE FUNCTION public.pulse_capture_health(p_symbol text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_object_agg(tf,jsonb_build_object(
    'state',CASE WHEN c.failure IS NOT NULL THEN 'attention' WHEN c.state='ready' THEN 'ready' ELSE 'unverified' END,
    'failure',c.failure,'capturedAt',c.captured_at,
    'checkedAt',floor(extract(epoch FROM coalesce(c.started_at,c.created_at))*1000)))
  FROM (VALUES (5),(15)) frames(tf)
  LEFT JOIN LATERAL (
    SELECT pc.state,pc.failure,pc.captured_at,pc.started_at,pe.created_at
    FROM public.pulse_spy_captures pc JOIN public.pulse_spy_events pe ON pe.id=pc.event_id
    WHERE pe.timeframe=tf AND pe.body->>'symbol'=p_symbol
      AND (pc.failure IS NOT NULL OR pc.state='ready')
    ORDER BY pe.at DESC,pe.created_at DESC,pe.id DESC LIMIT 1
  ) c ON true;
$$;
REVOKE ALL ON FUNCTION public.pulse_capture_health(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_capture_health(text) TO service_role;
