CREATE TABLE IF NOT EXISTS public.vault_onboarding_wake_tokens (
  token text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vault_onboarding_wake_tokens TO service_role;
REVOKE ALL ON public.vault_onboarding_wake_tokens FROM PUBLIC, anon, authenticated;
ALTER TABLE public.vault_onboarding_wake_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.vault_onboarding_wake()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
BEGIN
  DELETE FROM public.vault_onboarding_wake_tokens WHERE created_at < now() - interval '10 minutes';
  IF NOT EXISTS (SELECT 1 FROM public.vault_onboarding_outbox o
      WHERE o.state <> 'sent' AND o.next_attempt_at <= now()
        AND (o.locked_until IS NULL OR o.locked_until < now())) THEN
    RETURN;
  END IF;
  INSERT INTO public.vault_onboarding_wake_tokens(token) VALUES (t);
  PERFORM net.http_post(
    url := 'https://oemylhcjqncovnmvvgxh.supabase.co/functions/v1/sync-vault-onboarding',
    headers := jsonb_build_object('Content-Type','application/json','x-vault-wake', t),
    body := '{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.vault_onboarding_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_onboarding_wake() TO service_role;

CREATE OR REPLACE FUNCTION public.consume_vault_onboarding_wake(p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  WITH d AS (DELETE FROM public.vault_onboarding_wake_tokens
    WHERE token = p_token AND created_at <= now() AND created_at > now() - interval '2 minutes' RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM d);
$$;
REVOKE ALL ON FUNCTION public.consume_vault_onboarding_wake(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_vault_onboarding_wake(text) TO service_role;

DO $$
DECLARE jid bigint;
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'vault-onboarding-retry-hourly';
  jid := cron.schedule('vault-onboarding-retry-hourly', '17 * * * *', 'SELECT public.vault_onboarding_wake()');
  PERFORM cron.alter_job(job_id := jid, active := false);
END $$;