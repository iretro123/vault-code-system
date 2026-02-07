
-- Add account_balance to profiles as the persistent source of truth
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_balance NUMERIC NOT NULL DEFAULT 0;

-- Update get_or_create_vault_state to pull account_balance from profiles
-- and use it to derive daily_loss_limit, risk_remaining, and max_contracts
CREATE OR REPLACE FUNCTION public.get_or_create_vault_state(_user_id UUID)
RETURNS SETOF vault_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := CURRENT_DATE;
  _rules RECORD;
  _balance NUMERIC;
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

  -- Get user's trading rules
  SELECT max_daily_loss, max_risk_per_trade, max_trades_per_day
    INTO _rules
    FROM trading_rules
    WHERE user_id = _user_id
    LIMIT 1;

  -- Derive limits from balance
  -- daily_loss_limit = max_daily_loss% of balance (or rule default if no balance)
  _daily_loss := CASE
    WHEN _balance > 0 THEN ROUND(_balance * COALESCE(_rules.max_daily_loss, 3) / 100, 2)
    ELSE COALESCE(_rules.max_daily_loss, 3)
  END;

  -- max_contracts = balance / 5000, min 1 (if balance > 0)
  _max_contracts := CASE
    WHEN _balance > 0 THEN GREATEST(1, FLOOR(_balance / 5000))::INTEGER
    ELSE 0
  END;

  -- Insert new state for today
  INSERT INTO vault_state (
    user_id, date, account_balance, daily_loss_limit,
    max_trades_per_day, trades_remaining_today,
    risk_remaining_today, max_contracts_allowed, vault_status
  ) VALUES (
    _user_id, _today, _balance, _daily_loss,
    COALESCE(_rules.max_trades_per_day, 3),
    COALESCE(_rules.max_trades_per_day, 3),
    _daily_loss, _max_contracts,
    CASE WHEN _balance > 0 THEN 'GREEN' ELSE 'RED' END
  );

  RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = _today;
END;
$$;

-- RPC to set account balance (saves to profile, refreshes today's vault state)
CREATE OR REPLACE FUNCTION public.set_account_balance(_user_id UUID, _balance NUMERIC)
RETURNS SETOF vault_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rules RECORD;
  _daily_loss NUMERIC;
  _max_contracts INTEGER;
BEGIN
  IF _balance <= 0 THEN
    RAISE EXCEPTION 'Account balance must be greater than 0';
  END IF;

  -- Save to profile
  UPDATE profiles SET account_balance = _balance, updated_at = now()
    WHERE user_id = _user_id;

  -- Get trading rules
  SELECT max_daily_loss, max_trades_per_day
    INTO _rules FROM trading_rules WHERE user_id = _user_id LIMIT 1;

  -- Derive limits
  _daily_loss := ROUND(_balance * COALESCE(_rules.max_daily_loss, 3) / 100, 2);
  _max_contracts := GREATEST(1, FLOOR(_balance / 5000))::INTEGER;

  -- Update today's vault state
  UPDATE vault_state SET
    account_balance = _balance,
    daily_loss_limit = _daily_loss,
    risk_remaining_today = _daily_loss,
    max_contracts_allowed = _max_contracts,
    vault_status = 'GREEN',
    updated_at = now()
  WHERE user_id = _user_id AND date = CURRENT_DATE;

  -- If no state exists for today, create it
  IF NOT FOUND THEN
    RETURN QUERY SELECT * FROM get_or_create_vault_state(_user_id);
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = CURRENT_DATE;
END;
$$;
