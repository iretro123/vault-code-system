
-- Update all three RPCs to include survival mode logic
-- Survival mode: when raw_risk_per_trade < MIN_RISK_FLOOR (20), enforce:
--   max_contracts = 1, max_trades_per_day = 1, daily_loss_limit = MIN_RISK_FLOOR (20)

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
  _max_trades INTEGER;
  _risk_used NUMERIC;
BEGIN
  IF _balance <= 0 THEN
    RAISE EXCEPTION 'Account balance must be greater than 0';
  END IF;

  UPDATE profiles SET account_balance = _balance, updated_at = now()
    WHERE user_id = _user_id;

  SELECT COALESCE(vs.risk_mode, 'STANDARD') INTO _risk_mode
    FROM vault_state vs WHERE vs.user_id = _user_id AND vs.date = _today;
  IF _risk_mode IS NULL THEN _risk_mode := 'STANDARD'; END IF;

  -- Viability check
  IF _risk_mode = 'CONSERVATIVE' THEN
    IF (_balance * 0.01 / 2) < 20 THEN
      _risk_mode := 'STANDARD';
    END IF;
  END IF;

  _daily_pct := CASE _risk_mode
    WHEN 'CONSERVATIVE' THEN 0.01
    WHEN 'AGGRESSIVE' THEN 0.03
    ELSE 0.02
  END;

  _raw_daily := _balance * _daily_pct;
  _raw_per_trade := _raw_daily / 2;

  -- Survival mode check
  IF _raw_per_trade < 20 THEN
    _risk_per_trade := 20;
    _daily_loss := 20;
    _max_contracts := 1;
    _max_trades := 1;
  ELSE
    _risk_per_trade := LEAST(GREATEST(GREATEST(_raw_per_trade, 30), 20), 50);
    _daily_loss := _risk_per_trade * 2;
    _max_contracts := GREATEST(1, FLOOR(_risk_per_trade / 30))::INTEGER;
    _max_trades := 2;
  END IF;

  -- Preserve risk used today
  SELECT GREATEST(0, vs.daily_loss_limit - vs.risk_remaining_today) INTO _risk_used
    FROM vault_state vs WHERE vs.user_id = _user_id AND vs.date = _today;
  IF _risk_used IS NULL THEN _risk_used := 0; END IF;

  UPDATE vault_state SET
    account_balance = _balance,
    risk_mode = _risk_mode,
    daily_loss_limit = _daily_loss,
    risk_remaining_today = GREATEST(0, _daily_loss - _risk_used),
    max_contracts_allowed = _max_contracts,
    max_trades_per_day = _max_trades,
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
  _max_trades INTEGER;
  _risk_used NUMERIC;
  _trades_used INTEGER;
BEGIN
  IF _risk_mode NOT IN ('CONSERVATIVE', 'STANDARD', 'AGGRESSIVE') THEN
    RAISE EXCEPTION 'Invalid risk mode: %', _risk_mode;
  END IF;

  PERFORM get_or_create_vault_state(_user_id);

  SELECT vs.account_balance,
         GREATEST(0, vs.daily_loss_limit - vs.risk_remaining_today),
         (vs.max_trades_per_day - vs.trades_remaining_today)
    INTO _balance, _risk_used, _trades_used
    FROM vault_state vs WHERE vs.user_id = _user_id AND vs.date = _today;

  IF _balance IS NULL OR _balance <= 0 THEN _balance := 0; END IF;

  _effective_mode := _risk_mode;

  IF _effective_mode = 'CONSERVATIVE' THEN
    IF (_balance * 0.01 / 2) < 20 THEN
      _effective_mode := 'STANDARD';
    END IF;
  END IF;

  _daily_pct := CASE _effective_mode
    WHEN 'CONSERVATIVE' THEN 0.01
    WHEN 'AGGRESSIVE' THEN 0.03
    ELSE 0.02
  END;

  _raw_daily := _balance * _daily_pct;
  _raw_per_trade := _raw_daily / 2;

  -- Survival mode
  IF _raw_per_trade < 20 THEN
    _risk_per_trade := 20;
    _daily_loss := 20;
    _max_contracts := 1;
    _max_trades := 1;
  ELSE
    _risk_per_trade := LEAST(GREATEST(GREATEST(_raw_per_trade, 30), 20), 50);
    _daily_loss := _risk_per_trade * 2;
    _max_contracts := GREATEST(1, FLOOR(_risk_per_trade / 30))::INTEGER;
    _max_trades := 2;
  END IF;

  UPDATE vault_state SET
    risk_mode = _effective_mode,
    daily_loss_limit = _daily_loss,
    risk_remaining_today = GREATEST(0, _daily_loss - _risk_used),
    max_trades_per_day = _max_trades,
    trades_remaining_today = GREATEST(0, _max_trades - _trades_used),
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
  _max_trades INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM vault_state WHERE user_id = _user_id AND date = _today) THEN
    RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = _today;
    RETURN;
  END IF;

  SELECT COALESCE(p.account_balance, 0) INTO _balance
    FROM profiles p WHERE p.user_id = _user_id;
  IF _balance IS NULL THEN _balance := 0; END IF;

  SELECT vs.risk_mode INTO _risk_mode
    FROM vault_state vs WHERE vs.user_id = _user_id
    ORDER BY vs.date DESC LIMIT 1;
  IF _risk_mode IS NULL THEN _risk_mode := 'STANDARD'; END IF;

  _effective_mode := _risk_mode;

  IF _effective_mode = 'CONSERVATIVE' THEN
    IF _balance > 0 AND (_balance * 0.01 / 2) < 20 THEN
      _effective_mode := 'STANDARD';
    END IF;
  END IF;

  IF _balance > 0 THEN
    _daily_pct := CASE _effective_mode
      WHEN 'CONSERVATIVE' THEN 0.01
      WHEN 'AGGRESSIVE' THEN 0.03
      ELSE 0.02
    END;
    _raw_daily := _balance * _daily_pct;
    _raw_per_trade := _raw_daily / 2;

    -- Survival mode
    IF _raw_per_trade < 20 THEN
      _risk_per_trade := 20;
      _daily_loss := 20;
      _max_contracts := 1;
      _max_trades := 1;
    ELSE
      _risk_per_trade := LEAST(GREATEST(GREATEST(_raw_per_trade, 30), 20), 50);
      _daily_loss := _risk_per_trade * 2;
      _max_contracts := GREATEST(1, FLOOR(_risk_per_trade / 30))::INTEGER;
      _max_trades := 2;
    END IF;
  ELSE
    _daily_loss := 0;
    _max_contracts := 0;
    _max_trades := 2;
  END IF;

  INSERT INTO vault_state (
    user_id, date, account_balance, risk_mode, daily_loss_limit,
    max_trades_per_day, trades_remaining_today,
    risk_remaining_today, max_contracts_allowed, vault_status,
    session_paused
  ) VALUES (
    _user_id, _today, _balance, _effective_mode, _daily_loss,
    _max_trades, _max_trades,
    _daily_loss, _max_contracts,
    CASE WHEN _balance > 0 THEN 'GREEN' ELSE 'RED' END,
    true
  );

  RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = _today;
END;
$$;
