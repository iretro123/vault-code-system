CREATE POLICY "Users can self-assign basic_tier role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'basic_tier'::app_role);