
DROP POLICY IF EXISTS "Operators can insert live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Operators can update live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Operators can delete live sessions" ON public.live_sessions;

CREATE POLICY "Admins can insert live sessions"
ON public.live_sessions FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'operator'::app_role)
  OR has_academy_permission(auth.uid(), 'manage_live_sessions')
  OR has_academy_permission(auth.uid(), 'manage_content')
  OR is_academy_ceo(auth.uid())
);

CREATE POLICY "Admins can update live sessions"
ON public.live_sessions FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'operator'::app_role)
  OR has_academy_permission(auth.uid(), 'manage_live_sessions')
  OR has_academy_permission(auth.uid(), 'manage_content')
  OR is_academy_ceo(auth.uid())
);

CREATE POLICY "Admins can delete live sessions"
ON public.live_sessions FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'operator'::app_role)
  OR has_academy_permission(auth.uid(), 'manage_live_sessions')
  OR has_academy_permission(auth.uid(), 'manage_content')
  OR is_academy_ceo(auth.uid())
);
