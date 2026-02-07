
-- RPC: Get end-of-day review summary from vault_state + trade_intents
CREATE OR REPLACE FUNCTION public.get_eod_review(_user_id UUID)
RETURNS TABLE(
  trades_taken INTEGER,
  trades_blocked INTEGER,
  risk_used NUMERIC,
  risk_saved NUMERIC,
  final_vault_status TEXT,
  total_result NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _state RECORD;
  _blocked_count INTEGER;
  _blocked_risk NUMERIC;
  _closed_risk NUMERIC;
BEGIN
  -- Get today's vault state
  SELECT * INTO _state
    FROM vault_state
    WHERE user_id = _user_id AND date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0::NUMERIC, 0::NUMERIC, 'RED'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  -- Count blocked intents today
  SELECT COUNT(*)::INTEGER, COALESCE(SUM(estimated_risk), 0)
    INTO _blocked_count, _blocked_risk
    FROM trade_intents
    WHERE user_id = _user_id
      AND status = 'BLOCKED'
      AND created_at::date = CURRENT_DATE;

  -- Sum risk from closed intents today
  SELECT COALESCE(SUM(estimated_risk), 0)
    INTO _closed_risk
    FROM trade_intents
    WHERE user_id = _user_id
      AND status = 'CLOSED'
      AND created_at::date = CURRENT_DATE;

  -- trades_taken = max - remaining
  RETURN QUERY SELECT
    (_state.max_trades_per_day - _state.trades_remaining_today)::INTEGER,
    _blocked_count,
    _closed_risk,
    _blocked_risk,
    _state.vault_status,
    (_state.daily_loss_limit - _state.risk_remaining_today);
END;
$$;
