-- Supabase default privileges grant EXECUTE directly to anon/authenticated,
-- so REVOKE ... FROM PUBLIC alone left these service-only routines callable.
REVOKE EXECUTE ON FUNCTION public.record_vault_return_payment(text,text,text,text,text,timestamptz) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_vault_onboarding_jobs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_vault_return_membership() FROM anon;
GRANT EXECUTE ON FUNCTION public.record_vault_return_payment(text,text,text,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_vault_onboarding_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_vault_return_membership() TO authenticated, service_role;