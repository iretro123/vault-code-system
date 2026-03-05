
DROP POLICY "Authenticated users can insert referrals" ON public.referrals;

CREATE POLICY "Anyone can insert clicked referrals"
  ON public.referrals FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'clicked' OR auth.uid() IS NOT NULL);
