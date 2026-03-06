
-- 1. Drop anon SELECT on allowed_signups (CRITICAL: email leak)
DROP POLICY IF EXISTS "Anon can read unclaimed allowed signups" ON public.allowed_signups;

-- 2. Fix profiles SELECT: own profile OR operator only
DROP POLICY IF EXISTS "Authenticated users can read basic profile data" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'operator'::app_role));

-- 3. Create security-definer function for community profile lookups (non-PII only)
CREATE OR REPLACE FUNCTION public.get_community_profiles(_user_ids uuid[])
RETURNS TABLE(user_id uuid, avatar_url text, role_level text, academy_experience text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.avatar_url, p.role_level, p.academy_experience
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids);
$$;

-- 4. Fix inbox_items UPDATE: remove OR user_id IS NULL
DROP POLICY IF EXISTS "Users can update own inbox items" ON public.inbox_items;

CREATE POLICY "Users can update own inbox items"
  ON public.inbox_items FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
