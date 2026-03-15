
-- RPC: Atomically decrement risk_remaining_today for the current day
CREATE OR REPLACE FUNCTION public.decrement_risk_budget(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE vault_state
  SET risk_remaining_today = GREATEST(0, risk_remaining_today - p_amount),
      updated_at = now()
  WHERE user_id = p_user_id
    AND date = CURRENT_DATE;
$$;
