DROP POLICY IF EXISTS "Authenticated can read academy_user_roles" ON public.academy_user_roles;

CREATE POLICY "Users can read own academy role"
ON public.academy_user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Operators and CEO can read all academy roles"
ON public.academy_user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role) OR is_academy_ceo(auth.uid()));