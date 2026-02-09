
-- Updated close_trade_intent with new state transitions:
-- 1 loss → GREEN (unchanged)
-- 2 consecutive losses → YELLOW + auto-tighten (contracts halved, trades reduced by 1)
-- risk depleted → RED
-- No unlock mechanism
CREATE OR REPLACE FUNCTION public.close_trade_intent(_user_id UUID, _trade_result NUMERIC)
RETURNS TABLE(success BOOLEAN, message TEXT, new_vault_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _state RECORD;
  _intent RECORD;
  _new_status TEXT;
  _new_loss_streak INTEGER;
  _new_risk_remaining NUMERIC;
  _risk_delta NUMERIC;
  _new_max_contracts INTEGER;
  _new_trades_remaining INTEGER;
BEGIN
  SELECT * INTO _state
    FROM vault_state
    WHERE user_id = _user_id AND date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No vault state for today.'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF NOT _state.open_trade THEN
    RETURN QUERY SELECT false, 'No open trade to close.'::TEXT, _state.vault_status;
    RETURN;
  END IF;

  -- Find the open intent
  SELECT * INTO _intent
    FROM trade_intents
    WHERE user_id = _user_id AND status = 'OPEN'
    ORDER BY created_at DESC LIMIT 1;

  IF _intent.id IS NOT NULL THEN
    UPDATE trade_intents
    SET status = 'CLOSED', closed_at = now(), actual_pnl = _trade_result
    WHERE id = _intent.id;
  END IF;

  -- Risk accounting (risk was reserved at open)
  _new_risk_remaining := _state.risk_remaining_today;

  IF _trade_result < 0 THEN
    _risk_delta := ABS(_trade_result) - COALESCE(_intent.estimated_risk, 0);
    IF _risk_delta > 0 THEN
      _new_risk_remaining := _new_risk_remaining - _risk_delta;
    ELSIF _risk_delta < 0 THEN
      _new_risk_remaining := _new_risk_remaining + ABS(_risk_delta);
    END IF;
    IF _new_risk_remaining < 0 THEN _new_risk_remaining := 0; END IF;
    _new_loss_streak := _state.loss_streak + 1;
  ELSE
    _new_risk_remaining := _new_risk_remaining + COALESCE(_intent.estimated_risk, 0);
    _new_loss_streak := 0;
  END IF;

  -- Deterministic state transitions:
  -- RED: daily risk depleted (no override, no unlock)
  -- YELLOW: 2+ consecutive losses (auto-tighten, still tradeable)
  -- GREEN: all else
  _new_max_contracts := _state.max_contracts_allowed;
  _new_trades_remaining := _state.trades_remaining_today;

  IF _new_risk_remaining <= 0 THEN
    _new_status := 'RED';
  ELSIF _new_loss_streak >= 2 THEN
    _new_status := 'YELLOW';
    -- Auto-tighten: halve max contracts (min 1), reduce remaining trades by 1
    _new_max_contracts := GREATEST(1, FLOOR(_state.max_contracts_allowed::NUMERIC / 2))::INTEGER;
    _new_trades_remaining := GREATEST(0, _new_trades_remaining - 1);
  ELSE
    _new_status := 'GREEN';
  END IF;

  -- Update vault_state
  UPDATE vault_state
  SET
    open_trade = false,
    loss_streak = _new_loss_streak,
    risk_remaining_today = _new_risk_remaining,
    vault_status = _new_status,
    max_contracts_allowed = _new_max_contracts,
    trades_remaining_today = _new_trades_remaining,
    last_block_reason = CASE
      WHEN _new_status = 'RED' THEN 'Daily risk limit reached'
      WHEN _new_status = 'YELLOW' THEN 'Two consecutive losses — limits tightened'
      ELSE last_block_reason
    END,
    updated_at = now()
  WHERE user_id = _user_id AND date = CURRENT_DATE;

  PERFORM log_vault_event(_user_id, 'trade_closed', jsonb_build_object(
    'trade_result', _trade_result,
    'estimated_risk', COALESCE(_intent.estimated_risk, 0),
    'loss_streak', _new_loss_streak,
    'risk_remaining', _new_risk_remaining,
    'vault_status', _new_status,
    'auto_tightened', (_new_status = 'YELLOW')
  ));

  RETURN QUERY SELECT true,
    CASE
      WHEN _new_status = 'RED' THEN 'Trade closed. Daily risk depleted — trading locked.'
      WHEN _new_status = 'YELLOW' THEN 'Trade closed. Two losses — limits tightened automatically.'
      ELSE 'Trade closed. Vault updated.'
    END::TEXT,
    _new_status;
END;
$$;
