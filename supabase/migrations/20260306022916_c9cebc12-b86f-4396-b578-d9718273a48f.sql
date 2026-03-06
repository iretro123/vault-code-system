
-- Fix referrals INSERT: require authenticated + referrer_user_id = auth.uid()
DROP POLICY IF EXISTS "Anyone can insert clicked referrals" ON public.referrals;

CREATE POLICY "Authenticated users can insert referrals"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_user_id);
