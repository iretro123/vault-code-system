
-- Add actual_pnl column to trade_intents
ALTER TABLE public.trade_intents ADD COLUMN IF NOT EXISTS actual_pnl NUMERIC DEFAULT NULL;

-- Rewrite close_trade_intent with correct risk accounting and YELLOW status
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
    -- Store actual_pnl and close the intent
    UPDATE trade_intents
    SET status = 'CLOSED', closed_at = now(), actual_pnl = _trade_result
    WHERE id = _intent.id;
  END IF;

  -- Risk accounting:
  -- At open, estimated_risk was already subtracted from risk_remaining.
  -- On close:
  --   If loss: the reserved risk covers the loss. If actual loss > estimated,
  --            subtract the excess. If actual loss <= estimated, refund the difference.
  --   If win: refund the entire reserved risk (no risk was consumed).
  _new_risk_remaining := _state.risk_remaining_today;

  IF _trade_result < 0 THEN
    -- Loss: actual loss amount (positive)
    _risk_delta := ABS(_trade_result) - COALESCE(_intent.estimated_risk, 0);
    IF _risk_delta > 0 THEN
      -- Actual loss exceeded estimated — subtract excess
      _new_risk_remaining := _new_risk_remaining - _risk_delta;
    ELSIF _risk_delta < 0 THEN
      -- Actual loss less than estimated — refund difference
      _new_risk_remaining := _new_risk_remaining + ABS(_risk_delta);
    END IF;
    -- else exact match, no change needed
    IF _new_risk_remaining < 0 THEN _new_risk_remaining := 0; END IF;

    _new_loss_streak := _state.loss_streak + 1;
  ELSE
    -- Win or breakeven: refund reserved risk entirely
    _new_risk_remaining := _new_risk_remaining + COALESCE(_intent.estimated_risk, 0);
    _new_loss_streak := 0;
  END IF;

  -- Derive vault_status with YELLOW transition
  -- RED: risk depleted OR loss_streak >= 2
  -- YELLOW: loss_streak = 1 (one loss, caution)
  -- GREEN: no losses, risk available
  IF _new_risk_remaining <= 0 THEN
    _new_status := 'RED';
  ELSIF _new_loss_streak >= 2 THEN
    _new_status := 'RED';
  ELSIF _new_loss_streak = 1 THEN
    _new_status := 'YELLOW';
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
    last_block_reason = CASE
      WHEN _new_status = 'RED' AND _new_risk_remaining <= 0 THEN 'Daily risk limit reached'
      WHEN _new_status = 'RED' AND _new_loss_streak >= 2 THEN 'Two losses reached — trading locked'
      ELSE last_block_reason
    END,
    updated_at = now()
  WHERE user_id = _user_id AND date = CURRENT_DATE;

  -- Log vault event
  PERFORM log_vault_event(_user_id, 'trade_closed', jsonb_build_object(
    'trade_result', _trade_result,
    'estimated_risk', COALESCE(_intent.estimated_risk, 0),
    'loss_streak', _new_loss_streak,
    'risk_remaining', _new_risk_remaining,
    'vault_status', _new_status
  ));

  RETURN QUERY SELECT true,
    CASE
      WHEN _new_status = 'RED' AND _new_risk_remaining <= 0 THEN 'Trade closed. Daily risk depleted — vault is RED.'
      WHEN _new_status = 'RED' AND _new_loss_streak >= 2 THEN 'Trade closed. Two losses reached — vault is RED.'
      WHEN _new_status = 'YELLOW' THEN 'Trade closed. One loss recorded — caution active.'
      ELSE 'Trade closed. Vault updated.'
    END::TEXT,
    _new_status;
END;
$$;
