-- Pausing browser execution must not lose image work for genuine feed events.
-- Claim still checks capture_enabled. Resumed old work goes through the existing
-- freshness/exact-active-zone refresh path and preserves original event time.
CREATE OR REPLACE FUNCTION public.pulse_spy_queue_capture()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.at BETWEEN extract(epoch FROM now())*1000-60000 AND extract(epoch FROM now())*1000+5000 THEN
    INSERT INTO public.pulse_spy_captures(event_id) VALUES(NEW.id) ON CONFLICT DO NOTHING;
    UPDATE public.pulse_spy_events SET body=body || '{"captureStatus":"pending"}'::jsonb WHERE id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_spy_queue_capture() FROM PUBLIC,anon,authenticated;
