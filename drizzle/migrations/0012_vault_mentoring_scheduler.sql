CREATE TABLE IF NOT EXISTS public.vault_mentoring_wake_tokens (
  token text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vault_mentoring_wake_tokens TO service_role;
REVOKE ALL ON public.vault_mentoring_wake_tokens FROM PUBLIC, anon, authenticated;
ALTER TABLE public.vault_mentoring_wake_tokens ENABLE ROW LEVEL SECURITY;

-- Mints a single-use 2-minute token and wakes the worker only when a mentoring job is due.
CREATE OR REPLACE FUNCTION public.vault_mentoring_wake()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
BEGIN
  DELETE FROM public.vault_mentoring_wake_tokens WHERE created_at < now() - interval '10 minutes';
  IF NOT EXISTS (SELECT 1 FROM public.vault_mentoring_outbox o
      WHERE o.state = 'pending' AND o.next_attempt_at <= now()
        AND (o.locked_until IS NULL OR o.locked_until < now())) THEN
    RETURN;
  END IF;
  INSERT INTO public.vault_mentoring_wake_tokens(token) VALUES (t);
  PERFORM net.http_post(
    url := 'https://oemylhcjqncovnmvvgxh.supabase.co/functions/v1/sync-vault-mentoring',
    headers := jsonb_build_object('Content-Type','application/json','x-vault-wake', t),
    body := '{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.vault_mentoring_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_mentoring_wake() TO service_role;

CREATE OR REPLACE FUNCTION public.consume_vault_mentoring_wake(p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  WITH d AS (DELETE FROM public.vault_mentoring_wake_tokens
    WHERE token = p_token AND created_at <= now() AND created_at > now() - interval '2 minutes' RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM d);
$$;
REVOKE ALL ON FUNCTION public.consume_vault_mentoring_wake(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_vault_mentoring_wake(text) TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'vault-mentoring-retry-hourly';
  PERFORM cron.schedule('vault-mentoring-retry-hourly', '23 * * * *', 'SELECT public.vault_mentoring_wake()');
END $$;
