-- Create function to track vault session integrity
CREATE OR REPLACE FUNCTION public.get_vault_session_integrity(_user_id uuid)
RETURNS TABLE (
  trades_today int,
  verified_trades_today int,
  integrity_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH today_trades AS (
    SELECT vault_verified
    FROM public.trade_entries
    WHERE user_id = _user_id
      AND created_at >= date_trunc('day', now())
  )
  SELECT
    (SELECT count(*)::int FROM today_trades) AS trades_today,
    (SELECT count(*)::int FROM today_trades WHERE vault_verified = true) AS verified_trades_today,
    CASE
      WHEN (SELECT count(*) FROM today_trades) = 0 THEN 100
      ELSE round(
        ((SELECT count(*) FROM today_trades WHERE vault_verified = true)::numeric
          / (SELECT count(*) FROM today_trades)::numeric) * 100
      , 1)
    END AS integrity_percent;
END;
$$;

-- Secure the function
REVOKE ALL ON FUNCTION public.get_vault_session_integrity(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_vault_session_integrity(uuid) TO authenticated;