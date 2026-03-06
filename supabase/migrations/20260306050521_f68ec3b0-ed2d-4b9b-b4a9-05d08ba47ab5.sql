
CREATE OR REPLACE FUNCTION public.get_mention_users()
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.username, p.avatar_url
  FROM public.profiles p
  WHERE p.is_banned = false
  ORDER BY p.display_name ASC NULLS LAST
  LIMIT 500;
$$;
