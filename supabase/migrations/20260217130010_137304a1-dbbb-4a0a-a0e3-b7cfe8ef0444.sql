
-- Fix security definer view - recreate with SECURITY INVOKER
CREATE OR REPLACE VIEW public.referral_stats
WITH (security_invoker = true) AS
SELECT
  r.referrer_user_id AS user_id,
  COUNT(*) FILTER (WHERE r.status IN ('signed_up', 'paid')) AS total_signed_up,
  COUNT(*) FILTER (WHERE r.status = 'paid') AS total_paid,
  MAX(r.created_at) AS last_referral_at,
  0 AS current_streak_weeks
FROM public.referrals r
GROUP BY r.referrer_user_id;
