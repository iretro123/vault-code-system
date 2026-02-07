
CREATE OR REPLACE FUNCTION public.close_trade_intent(_user_id UUID, _trade_result NUMERIC)
RETURNS TABLE(success BOOLEAN, message TEXT, new_vault_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _state RECORD;
  _intent_id UUID;
  _new_status TEXT;
  _new_loss_streak INTEGER;
  _new_risk_remaining NUMERIC;
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

  -- Close the open intent
  SELECT id INTO _intent_id
    FROM trade_intents
    WHERE user_id = _user_id AND status = 'OPEN'
    ORDER BY created_at DESC LIMIT 1;

  IF _intent_id IS NOT NULL THEN
    UPDATE trade_intents SET status = 'CLOSED', closed_at = now() WHERE id = _intent_id;
  END IF;

  -- Calculate new values
  _new_risk_remaining := _state.risk_remaining_today;

  IF _trade_result < 0 THEN
    _new_loss_streak := _state.loss_streak + 1;
    _new_risk_remaining := _new_risk_remaining - abs(_trade_result);
    IF _new_risk_remaining < 0 THEN _new_risk_remaining := 0; END IF;
  ELSE
    _new_loss_streak := 0;
  END IF;

  -- Derive vault_status purely from rules (no carry-over)
  IF _new_risk_remaining <= 0 THEN
    _new_status := 'RED';
  ELSIF _new_loss_streak >= 2 THEN
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
    updated_at = now()
  WHERE user_id = _user_id AND date = CURRENT_DATE;

  -- Log vault event
  PERFORM log_vault_event(_user_id, 'trade_closed', jsonb_build_object(
    'trade_result', _trade_result,
    'loss_streak', _new_loss_streak,
    'risk_remaining', _new_risk_remaining,
    'vault_status', _new_status
  ));

  RETURN QUERY SELECT true,
    CASE
      WHEN _new_status = 'RED' THEN 'Trade closed. Risk depleted — vault is now RED.'
      WHEN _new_status = 'YELLOW' THEN 'Trade closed. Loss streak detected — vault is now YELLOW.'
      ELSE 'Trade closed. Vault updated.'
    END::TEXT,
    _new_status;
END;
$$;
