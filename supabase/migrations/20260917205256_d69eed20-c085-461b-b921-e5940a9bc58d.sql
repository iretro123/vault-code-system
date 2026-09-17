-- Member discovery for the message picker
CREATE FUNCTION public.discover_message_members(term text DEFAULT '')
RETURNS TABLE(user_id uuid,display_name text,avatar_url text,username text,is_rz boolean,activity_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH visible_recent AS (
   SELECT m.user_id FROM public.academy_messages m
   WHERE m.created_at > now()-interval '30 days' AND m.is_deleted=false AND m.room_slug='trade-floor'
   AND m.parent_message_id IS NULL
   ORDER BY m.created_at DESC LIMIT 500
 ), activity AS (SELECT r.user_id,count(*) total FROM visible_recent r GROUP BY r.user_id), people AS (
 SELECT p.*,lower(trim(coalesce(p.display_name,'')))='rz' AND EXISTS(SELECT 1 FROM public.academy_user_roles ur JOIN public.academy_roles ar ON ar.id=ur.role_id WHERE ur.user_id=p.user_id AND ar.name='CEO') AS founder FROM public.profiles p
 )
 SELECT p.user_id,coalesce(p.display_name,p.username,'Vault member'),p.avatar_url,p.username,
 p.founder,coalesce(a.total,0)
 FROM people p LEFT JOIN activity a ON a.user_id=p.user_id
 WHERE public.member_messaging_eligible(auth.uid()) AND public.member_messaging_eligible(p.user_id)
 AND (p.user_id<>auth.uid() OR p.founder)
 AND length(trim(term))<=80
 AND (CASE WHEN trim(term)='' THEN a.total>0 OR p.founder
 ELSE strpos(lower(coalesce(p.display_name,'')||' '||coalesce(p.username,'')),lower(trim(term)))>0 END)
 AND NOT EXISTS(SELECT 1 FROM public.member_message_blocks b WHERE (b.blocker_id=auth.uid() AND b.blocked_id=p.user_id) OR (b.blocker_id=p.user_id AND b.blocked_id=auth.uid()))
 ORDER BY p.founder DESC,coalesce(a.total,0) DESC,p.display_name LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.discover_message_members(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discover_message_members(text) TO authenticated;

-- Service-only inventory of a member's uploads, used by account deletion
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

-- A profile ban overrides every membership/staff role for member contact
CREATE OR REPLACE FUNCTION public.member_messaging_eligible(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.profiles p
  JOIN public.user_roles r ON r.user_id=p.user_id
  JOIN auth.users u ON u.id=p.user_id
  WHERE p.user_id=uid AND coalesce(p.access_status,'') <> 'banned'
  AND (r.subscription_status='active' OR r.role::text IN ('free','operator','vault_os_owner'))
  AND lower(coalesce(u.email,'')) <> 'guest@vaulttradingacademy.com'
  AND coalesce(u.raw_user_meta_data->>'is_shared_guest','false') <> 'true'
  AND (r.subscription_expires_at IS NULL OR r.subscription_expires_at>now() OR r.role::text IN ('operator','vault_os_owner'))
 );
$$;
REVOKE EXECUTE ON FUNCTION public.member_messaging_eligible(uuid) FROM PUBLIC, anon;