-- Operator checks must serialize with live captures, and yield to pending events.
CREATE OR REPLACE FUNCTION public.pulse_spy_capture_probe_claim(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.pulse_spy_config%ROWTYPE; ticket uuid:=gen_random_uuid();
BEGIN
  IF NOT public.pulse_spy_worker_allowed(p_token) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id FOR UPDATE;
  IF cfg.capture_lease_until>now() OR EXISTS(SELECT 1 FROM public.pulse_spy_captures WHERE state IN ('queued','running')) THEN
    RETURN jsonb_build_object('busy',true);
  END IF;
  UPDATE public.pulse_spy_config SET capture_lease=ticket,capture_lease_until=now()+interval '40 seconds' WHERE id;
  RETURN jsonb_build_object('lease',ticket);
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_spy_capture_probe_claim(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pulse_spy_capture_probe_claim(text) TO anon;
