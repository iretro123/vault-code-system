
-- Referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID,
  referred_email TEXT,
  status TEXT NOT NULL DEFAULT 'clicked',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referrers can see their own referrals
CREATE POLICY "Users can read own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_user_id);

-- Anyone authenticated can insert (for signup capture)
CREATE POLICY "Authenticated users can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update own referrals (status changes)
CREATE POLICY "Users can update own referrals"
  ON public.referrals FOR UPDATE
  USING (auth.uid() = referrer_user_id);

-- Referral stats view
CREATE OR REPLACE VIEW public.referral_stats AS
SELECT
  r.referrer_user_id AS user_id,
  COUNT(*) FILTER (WHERE r.status IN ('signed_up', 'paid')) AS total_signed_up,
  COUNT(*) FILTER (WHERE r.status = 'paid') AS total_paid,
  MAX(r.created_at) AS last_referral_at,
  -- streak: count consecutive weeks with at least 1 referral going back from now
  0 AS current_streak_weeks
FROM public.referrals r
GROUP BY r.referrer_user_id;
