
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _user_id UUID,
  _balance NUMERIC,
  _market_type TEXT,
  _default_style TEXT
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile
  UPDATE profiles
  SET
    default_trading_style = _default_style,
    market_type = _market_type,
    onboarding_completed = true,
    updated_at = now()
  WHERE user_id = _user_id;

  -- Set account balance (creates vault_state + calculates limits)
  PERFORM set_account_balance(_user_id, _balance);

  -- Set risk mode to CONSERVATIVE for new users
  UPDATE vault_state
  SET risk_mode = 'CONSERVATIVE',
      updated_at = now()
  WHERE user_id = _user_id AND date = CURRENT_DATE;

  RETURN true;
END;
$$;
