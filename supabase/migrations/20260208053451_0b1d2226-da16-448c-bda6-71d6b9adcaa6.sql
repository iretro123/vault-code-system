
-- Add initialized_at timestamp to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initialized_at timestamptz;

-- Update complete_onboarding to set initialized_at
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
  UPDATE profiles
  SET
    default_trading_style = _default_style,
    market_type = _market_type,
    onboarding_completed = true,
    initialized_at = now(),
    updated_at = now()
  WHERE user_id = _user_id;

  PERFORM set_account_balance(_user_id, _balance);

  UPDATE vault_state
  SET risk_mode = 'CONSERVATIVE',
      updated_at = now()
  WHERE user_id = _user_id AND date = CURRENT_DATE;

  RETURN true;
END;
$$;
