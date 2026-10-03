-- PREPARED, NOT APPLIED. Hourly retry backstop for sync-vault-onboarding that
-- needs no pre-shared secret in cron, Git, or the DB vault.
-- The database mints a single-use, 2-minute wake token in a server-only table
-- and sends it to the worker. The worker (service role) atomically consumes it.
-- Only the database can create tokens; members/anon cannot read or write them.
-- Apply only after the reviewed worker (which accepts x-vault-wake) is deployed.

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
  -- Do nothing (no HTTP call) while no job is due.
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

-- Schedule (run separately, then pause it in Cloud -> Jobs until root verifies):
-- SELECT cron.schedule('vault-onboarding-retry-hourly', '17 * * * *', $$SELECT public.vault_onboarding_wake()$$);
