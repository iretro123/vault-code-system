-- Disable scheduled live session notifications (manual only)
DO $$
DECLARE
  v_job_id integer;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'notify-live-sessions';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.notify_live_sessions();

ALTER TABLE public.live_sessions
  DROP COLUMN IF EXISTS live_notified_at;
