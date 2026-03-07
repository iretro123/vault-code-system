
-- 1. Add profiles to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 2. Add permissive SELECT policy so members can read other profiles (for presence/avatars)
CREATE POLICY "Authenticated can read all profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);
