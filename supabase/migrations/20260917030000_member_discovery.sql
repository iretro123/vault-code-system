-- Suggested members on opening the picker, plus full eligible-member search.
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
REVOKE ALL ON FUNCTION public.discover_message_members(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discover_message_members(text) TO authenticated;
