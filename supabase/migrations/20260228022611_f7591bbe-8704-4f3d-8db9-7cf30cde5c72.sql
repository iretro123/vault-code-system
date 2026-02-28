CREATE POLICY "Operators can read all referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role));