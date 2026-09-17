-- Deploy with the updated delete-account function after isolated staging tests.
-- Read-only inventory: blobs are removed using the Storage API, not SQL.
CREATE OR REPLACE FUNCTION public.list_account_uploads_for_deletion(target_user uuid)
RETURNS TABLE(bucket_id text, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT o.bucket_id, o.name
  FROM storage.objects o
  WHERE coalesce(o.owner_id, o.owner::text) = target_user::text
    AND o.bucket_id IN ('avatars', 'academy-chat-files', 'ticket-screenshots', 'trade-screenshots', 'vault-member-files')
  ORDER BY o.bucket_id, o.name
  LIMIT 200;
$$;
REVOKE ALL ON FUNCTION public.list_account_uploads_for_deletion(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_account_uploads_for_deletion(uuid) TO service_role;
