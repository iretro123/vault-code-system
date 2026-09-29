-- These maintenance routines bypass RLS and are invoked by trusted cron/triggers,
-- never by a member UI. Do not let an API caller reset everyone's daily state.
REVOKE ALL ON FUNCTION public.daily_vault_reset() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cleanup_deleted_messages() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.grant_whitelist_access(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.revoke_whitelist_access(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.daily_vault_reset(),public.cleanup_deleted_messages(),public.grant_whitelist_access(text),public.revoke_whitelist_access(text) TO service_role;
-- Operators still use this authenticated RPC, with its existing role checks.
REVOKE ALL ON FUNCTION public.admin_override_access(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_override_access(uuid,text,text) TO authenticated,service_role;
