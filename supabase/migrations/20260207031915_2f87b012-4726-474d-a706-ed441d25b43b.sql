
-- Trade intents table: logs every attempt (approved or blocked)
CREATE TABLE public.trade_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('CALL', 'PUT')),
  contracts INTEGER NOT NULL,
  estimated_risk NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OPEN', 'BLOCKED', 'CLOSED')),
  block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.trade_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trade intents"
  ON public.trade_intents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trade intents"
  ON public.trade_intents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trade intents"
  ON public.trade_intents FOR UPDATE USING (auth.uid() = user_id);

-- RPC: Submit trade intent with full server-side validation
CREATE OR REPLACE FUNCTION public.submit_trade_intent(
  _user_id UUID,
  _direction TEXT,
  _contracts INTEGER,
  _estimated_risk NUMERIC
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  intent_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _state RECORD;
  _intent_id UUID;
  _block_reason TEXT;
BEGIN
  -- Validate inputs
  IF _direction NOT IN ('CALL', 'PUT') THEN
    RETURN QUERY SELECT false, 'Invalid direction. Must be CALL or PUT.'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF _contracts < 1 THEN
    RETURN QUERY SELECT false, 'Contracts must be at least 1.'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF _estimated_risk <= 0 THEN
    RETURN QUERY SELECT false, 'Estimated risk must be greater than 0.'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Get current vault state for today
  SELECT * INTO _state
    FROM vault_state
    WHERE user_id = _user_id AND date = CURRENT_DATE;

  IF NOT FOUND THEN
    -- Log blocked attempt
    INSERT INTO trade_intents (user_id, direction, contracts, estimated_risk, status, block_reason)
    VALUES (_user_id, _direction, _contracts, _estimated_risk, 'BLOCKED', 'No vault state for today');
    RETURN QUERY SELECT false, 'Vault not initialized. Open the dashboard first.'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Validation checks
  IF _state.vault_status = 'RED' THEN
    _block_reason := 'Vault status is RED. Trading is not permitted.';
  ELSIF _state.open_trade THEN
    _block_reason := 'You already have an open trade. Close it first.';
  ELSIF _state.trades_remaining_today <= 0 THEN
    _block_reason := 'No trades remaining today.';
  ELSIF _contracts > _state.max_contracts_allowed THEN
    _block_reason := format('Contracts (%s) exceed max allowed (%s).', _contracts, _state.max_contracts_allowed);
  ELSIF _estimated_risk > _state.risk_remaining_today THEN
    _block_reason := format('Estimated risk ($%s) exceeds remaining risk ($%s).', _estimated_risk, _state.risk_remaining_today);
  END IF;

  IF _block_reason IS NOT NULL THEN
    -- Log blocked attempt
    INSERT INTO trade_intents (user_id, direction, contracts, estimated_risk, status, block_reason)
    VALUES (_user_id, _direction, _contracts, _estimated_risk, 'BLOCKED', _block_reason)
    RETURNING id INTO _intent_id;

    -- Log vault event
    PERFORM log_vault_event(_user_id, 'trade_intent_blocked', jsonb_build_object(
      'intent_id', _intent_id,
      'direction', _direction,
      'contracts', _contracts,
      'estimated_risk', _estimated_risk,
      'reason', _block_reason
    ));

    RETURN QUERY SELECT false, _block_reason, _intent_id;
    RETURN;
  END IF;

  -- All checks passed — authorize the trade
  INSERT INTO trade_intents (user_id, direction, contracts, estimated_risk, status)
  VALUES (_user_id, _direction, _contracts, _estimated_risk, 'OPEN')
  RETURNING id INTO _intent_id;

  -- Update vault_state: reserve risk and mark open trade
  UPDATE vault_state
  SET
    open_trade = true,
    risk_remaining_today = risk_remaining_today - _estimated_risk,
    trades_remaining_today = trades_remaining_today - 1,
    updated_at = now()
  WHERE user_id = _user_id AND date = CURRENT_DATE;

  -- Log vault event
  PERFORM log_vault_event(_user_id, 'trade_intent_approved', jsonb_build_object(
    'intent_id', _intent_id,
    'direction', _direction,
    'contracts', _contracts,
    'estimated_risk', _estimated_risk
  ));

  RETURN QUERY SELECT true, 'Trade Authorized. Go to your broker and place the trade now.'::TEXT, _intent_id;
END;
$$;
