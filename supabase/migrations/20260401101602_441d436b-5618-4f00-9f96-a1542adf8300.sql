DROP FUNCTION IF EXISTS public.get_community_profiles(uuid[]);

CREATE FUNCTION public.get_community_profiles(_user_ids uuid[])
RETURNS TABLE(user_id uuid, avatar_url text, role_level text, academy_experience text, bio text, social_twitter text, social_instagram text, social_tiktok text, social_youtube text, display_name text, username text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.avatar_url, p.role_level, p.academy_experience,
         p.bio, p.social_twitter, p.social_instagram, p.social_tiktok, p.social_youtube,
         p.display_name, p.username, p.created_at
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids);
$$;