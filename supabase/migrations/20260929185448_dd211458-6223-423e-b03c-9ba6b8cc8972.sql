-- Paid resources must not be accessible through direct Storage APIs.
CREATE POLICY "Canonical membership for paid files" ON storage.objects
AS RESTRICTIVE FOR SELECT TO authenticated,anon
USING (bucket_id NOT IN ('playbook','toolkit-files') OR public.has_current_full_access());

-- Chat paths: room/user/file, calendar/user/file, dm-<thread UUID>/user/file.
-- INVOKER preserves dm_threads' own participant/staff RLS; no membership bypass.
CREATE OR REPLACE FUNCTION public.vault_can_read_chat_file(object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT CASE WHEN NOT public.can_use_free_community() THEN false
   WHEN split_part(object_name,'/',1) LIKE 'dm-%' THEN EXISTS (
     SELECT 1 FROM public.dm_threads WHERE id::text=substring(split_part(object_name,'/',1) FROM 4))
   WHEN split_part(object_name,'/',1) IN ('trade-floor','wins-proof','questions','off-topic','calendar') THEN true
   WHEN split_part(object_name,'/',1)='daily-setups' THEN public.has_current_full_access()
   ELSE false END;
$$;
REVOKE ALL ON FUNCTION public.vault_can_read_chat_file(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vault_can_read_chat_file(text) TO authenticated,anon,service_role;
CREATE POLICY "Member and thread boundary for chat files" ON storage.objects
AS RESTRICTIVE FOR SELECT TO authenticated,anon
USING (bucket_id<>'academy-chat-files' OR public.vault_can_read_chat_file(name));
-- Public downloads bypass SELECT policies. The separately gated private-bucket
-- cutover must follow publishing compatible web/native attachment readers.