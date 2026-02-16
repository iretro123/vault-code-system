
-- Allow authenticated users to read basic profile info for chat display
CREATE POLICY "Authenticated users can read basic profile data"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
