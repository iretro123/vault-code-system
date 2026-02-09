
-- Rewrite set_account_balance to use canonical Vault OS math
-- Constants: MIN_VIABLE_CONTRACT=20, TARGET_CONTRACT=30, MAX_CONTRACT=50, MAX_LOSSES_PER_DAY=2
-- Risk percentages: CONSERVATIVE=1%, STANDARD=2%, AGGRESSIVE=3%
CREATE OR REPLACE FUNCTION public.set_account_balance(_user_id UUID, _balance NUMERIC)
RETURNS SETOF vault_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := CURRENT_DATE;
  _risk_mode TEXT;
  _daily_pct NUMERIC;
  _raw_daily NUMERIC;
  _raw_per_trade NUMERIC;
  _risk_per_trade NUMERIC;
  _daily_loss NUMERIC;
  _max_contracts INTEGER;
  _risk_used NUMERIC;
BEGIN
  IF _balance <= 0 THEN
    RAISE EXCEPTION 'Account balance must be greater than 0';
  END IF;

  -- Save to profile
  UPDATE profiles SET account_balance = _balance, updated_at = now()
    WHERE user_id = _user_id;

  -- Get current risk mode (default STANDARD)
  SELECT COALESCE(vs.risk_mode, 'STANDARD') INTO _risk_mode
    FROM vault_state vs WHERE vs.user_id = _user_id AND vs.date = _today;
  IF _risk_mode IS NULL THEN _risk_mode := 'STANDARD'; END IF;

  -- Viability check: if CONSERVATIVE produces raw_per_trade < 20, force STANDARD
  IF _risk_mode = 'CONSERVATIVE' THEN
    IF (_balance * 0.01 / 2) < 20 THEN
      _risk_mode := 'STANDARD';
    END IF;
  END IF;

  -- Canonical math from computeVaultLimits
  _daily_pct := CASE _risk_mode
    WHEN 'CONSERVATIVE' THEN 0.01
    WHEN 'AGGRESSIVE' THEN 0.03
    ELSE 0.02
  END;

  _raw_daily := _balance * _daily_pct;
  _raw_per_trade := _raw_daily / 2;
  -- Clamp: max(max(raw, TARGET_CONTRACT), MIN_VIABLE_CONTRACT) then min with MAX_CONTRACT
  _risk_per_trade := LEAST(GREATEST(GREATEST(_raw_per_trade, 30), 20), 50);
  _daily_loss := _risk_per_trade * 2;
  _max_contracts := GREATEST(1, FLOOR(_risk_per_trade / 30))::INTEGER;

  -- Calculate how much risk has been used today (preserve it)
  SELECT GREATEST(0, vs.daily_loss_limit - vs.risk_remaining_today) INTO _risk_used
    FROM vault_state vs WHERE vs.user_id = _user_id AND vs.date = _today;
  IF _risk_used IS NULL THEN _risk_used := 0; END IF;

  -- Update today's vault state
  UPDATE vault_state SET
    account_balance = _balance,
    risk_mode = _risk_mode,
    daily_loss_limit = _daily_loss,
    risk_remaining_today = GREATEST(0, _daily_loss - _risk_used),
    max_contracts_allowed = _max_contracts,
    max_trades_per_day = 2,
    vault_status = CASE WHEN GREATEST(0, _daily_loss - _risk_used) <= 0 THEN 'RED' ELSE 'GREEN' END,
    updated_at = now()
  WHERE user_id = _user_id AND date = _today;

  IF NOT FOUND THEN
    RETURN QUERY SELECT * FROM get_or_create_vault_state(_user_id);
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = _today;
END;
$$;

-- Rewrite update_vault_risk_mode to use canonical Vault OS math
CREATE OR REPLACE FUNCTION public.update_vault_risk_mode(_user_id UUID, _risk_mode TEXT)
RETURNS SETOF vault_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := CURRENT_DATE;
  _balance NUMERIC;
  _effective_mode TEXT;
  _daily_pct NUMERIC;
  _raw_daily NUMERIC;
  _raw_per_trade NUMERIC;
  _risk_per_trade NUMERIC;
  _daily_loss NUMERIC;
  _max_contracts INTEGER;
  _risk_used NUMERIC;
  _trades_used INTEGER;
BEGIN
  IF _risk_mode NOT IN ('CONSERVATIVE', 'STANDARD', 'AGGRESSIVE') THEN
    RAISE EXCEPTION 'Invalid risk mode: %', _risk_mode;
  END IF;

  -- Ensure today's vault_state row exists
  PERFORM get_or_create_vault_state(_user_id);

  -- Get current balance and usage
  SELECT vs.account_balance,
         GREATEST(0, vs.daily_loss_limit - vs.risk_remaining_today),
         (vs.max_trades_per_day - vs.trades_remaining_today)
    INTO _balance, _risk_used, _trades_used
    FROM vault_state vs WHERE vs.user_id = _user_id AND vs.date = _today;

  IF _balance IS NULL OR _balance <= 0 THEN
    _balance := 0;
  END IF;

  _effective_mode := _risk_mode;

  -- Viability check: if CONSERVATIVE produces raw_per_trade < 20, force STANDARD
  IF _effective_mode = 'CONSERVATIVE' THEN
    IF (_balance * 0.01 / 2) < 20 THEN
      _effective_mode := 'STANDARD';
    END IF;
  END IF;

  -- Canonical math
  _daily_pct := CASE _effective_mode
    WHEN 'CONSERVATIVE' THEN 0.01
    WHEN 'AGGRESSIVE' THEN 0.03
    ELSE 0.02
  END;

  _raw_daily := _balance * _daily_pct;
  _raw_per_trade := _raw_daily / 2;
  _risk_per_trade := LEAST(GREATEST(GREATEST(_raw_per_trade, 30), 20), 50);
  _daily_loss := _risk_per_trade * 2;
  _max_contracts := GREATEST(1, FLOOR(_risk_per_trade / 30))::INTEGER;

  -- Update vault_state with recalculated limits, preserving usage
  UPDATE vault_state SET
    risk_mode = _effective_mode,
    daily_loss_limit = _daily_loss,
    risk_remaining_today = GREATEST(0, _daily_loss - _risk_used),
    max_trades_per_day = 2,
    trades_remaining_today = GREATEST(0, 2 - _trades_used),
    max_contracts_allowed = _max_contracts,
    vault_status = CASE
      WHEN GREATEST(0, _daily_loss - _risk_used) <= 0 THEN 'RED'
      WHEN loss_streak >= 2 THEN 'RED'
      ELSE vault_status
    END,
    updated_at = now()
  WHERE user_id = _user_id AND date = _today;

  RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = _today;
END;
$$;

-- Also fix get_or_create_vault_state to use canonical math for new day creation
CREATE OR REPLACE FUNCTION public.get_or_create_vault_state(_user_id UUID)
RETURNS SETOF vault_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := CURRENT_DATE;
  _balance NUMERIC;
  _risk_mode TEXT;
  _effective_mode TEXT;
  _daily_pct NUMERIC;
  _raw_daily NUMERIC;
  _raw_per_trade NUMERIC;
  _risk_per_trade NUMERIC;
  _daily_loss NUMERIC;
  _max_contracts INTEGER;
BEGIN
  -- Return existing state for today
  IF EXISTS (SELECT 1 FROM vault_state WHERE user_id = _user_id AND date = _today) THEN
    RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = _today;
    RETURN;
  END IF;

  -- Get account balance from profile
  SELECT COALESCE(p.account_balance, 0) INTO _balance
    FROM profiles p WHERE p.user_id = _user_id;
  IF _balance IS NULL THEN _balance := 0; END IF;

  -- Get last known risk mode or default
  SELECT vs.risk_mode INTO _risk_mode
    FROM vault_state vs WHERE vs.user_id = _user_id
    ORDER BY vs.date DESC LIMIT 1;
  IF _risk_mode IS NULL THEN _risk_mode := 'STANDARD'; END IF;

  _effective_mode := _risk_mode;

  -- Viability check
  IF _effective_mode = 'CONSERVATIVE' THEN
    IF _balance > 0 AND (_balance * 0.01 / 2) < 20 THEN
      _effective_mode := 'STANDARD';
    END IF;
  END IF;

  -- Canonical math
  IF _balance > 0 THEN
    _daily_pct := CASE _effective_mode
      WHEN 'CONSERVATIVE' THEN 0.01
      WHEN 'AGGRESSIVE' THEN 0.03
      ELSE 0.02
    END;
    _raw_daily := _balance * _daily_pct;
    _raw_per_trade := _raw_daily / 2;
    _risk_per_trade := LEAST(GREATEST(GREATEST(_raw_per_trade, 30), 20), 50);
    _daily_loss := _risk_per_trade * 2;
    _max_contracts := GREATEST(1, FLOOR(_risk_per_trade / 30))::INTEGER;
  ELSE
    _daily_loss := 0;
    _max_contracts := 0;
  END IF;

  -- Insert new state for today (session defaults to paused)
  INSERT INTO vault_state (
    user_id, date, account_balance, risk_mode, daily_loss_limit,
    max_trades_per_day, trades_remaining_today,
    risk_remaining_today, max_contracts_allowed, vault_status,
    session_paused
  ) VALUES (
    _user_id, _today, _balance, _effective_mode, _daily_loss,
    2, 2,
    _daily_loss, _max_contracts,
    CASE WHEN _balance > 0 THEN 'GREEN' ELSE 'RED' END,
    true
  );

  RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = _today;
END;
$$;
