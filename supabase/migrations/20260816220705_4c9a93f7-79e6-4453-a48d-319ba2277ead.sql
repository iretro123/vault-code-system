REVOKE ALL ON FUNCTION public.grant_whitelist_access(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_whitelist_access(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.repair_whitelist_access() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_allowed_signups_access() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_profile_whitelist_access() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_whitelist_access() TO service_role;