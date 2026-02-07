
-- RPC to update risk mode and recalculate limits server-side
CREATE OR REPLACE FUNCTION public.update_vault_risk_mode(
  _user_id UUID,
  _risk_mode TEXT
)
RETURNS SETOF public.vault_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := CURRENT_DATE;
  _rules RECORD;
  _base_loss NUMERIC;
  _base_trades INTEGER;
  _base_contracts INTEGER;
  _multiplier NUMERIC;
BEGIN
  -- Validate risk mode
  IF _risk_mode NOT IN ('CONSERVATIVE', 'STANDARD', 'AGGRESSIVE') THEN
    RAISE EXCEPTION 'Invalid risk mode: %', _risk_mode;
  END IF;

  -- Get user's base trading rules
  SELECT max_daily_loss, max_trades_per_day
    INTO _rules
    FROM trading_rules
    WHERE user_id = _user_id
    LIMIT 1;

  _base_loss := COALESCE(_rules.max_daily_loss, 3);
  _base_trades := COALESCE(_rules.max_trades_per_day, 3);

  -- Calculate multipliers based on mode
  CASE _risk_mode
    WHEN 'CONSERVATIVE' THEN
      _multiplier := 0.5;
    WHEN 'STANDARD' THEN
      _multiplier := 1.0;
    WHEN 'AGGRESSIVE' THEN
      _multiplier := 1.5;
  END CASE;

  -- Ensure today's vault_state row exists
  PERFORM get_or_create_vault_state(_user_id);

  -- Calculate derived values
  _base_contracts := CASE _risk_mode
    WHEN 'CONSERVATIVE' THEN 1
    WHEN 'STANDARD' THEN 2
    WHEN 'AGGRESSIVE' THEN 4
  END;

  -- Update vault_state with recalculated limits
  UPDATE vault_state
  SET
    risk_mode = _risk_mode,
    daily_loss_limit = ROUND(_base_loss * _multiplier, 2),
    risk_remaining_today = ROUND(_base_loss * _multiplier, 2),
    max_trades_per_day = GREATEST(1, ROUND(_base_trades * _multiplier)),
    trades_remaining_today = GREATEST(1, ROUND(_base_trades * _multiplier)),
    max_contracts_allowed = _base_contracts,
    updated_at = now()
  WHERE user_id = _user_id AND date = _today;

  RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = _today;
END;
$$;
