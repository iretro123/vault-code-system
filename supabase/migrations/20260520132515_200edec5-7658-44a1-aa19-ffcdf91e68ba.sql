CREATE POLICY "Admins can read push dispatches"
ON public.notification_push_dispatches
FOR SELECT
TO authenticated
USING (has_academy_permission(auth.uid(), 'view_admin_panel') OR has_role(auth.uid(), 'operator'::app_role));