
-- Vault State: single source of truth per user per day
CREATE TABLE public.vault_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  vault_status TEXT NOT NULL DEFAULT 'RED' CHECK (vault_status IN ('GREEN', 'YELLOW', 'RED')),
  risk_mode TEXT NOT NULL DEFAULT 'STANDARD' CHECK (risk_mode IN ('CONSERVATIVE', 'STANDARD', 'AGGRESSIVE')),
  account_balance NUMERIC NOT NULL DEFAULT 0,
  daily_loss_limit NUMERIC NOT NULL DEFAULT 0,
  risk_remaining_today NUMERIC NOT NULL DEFAULT 0,
  max_contracts_allowed INTEGER NOT NULL DEFAULT 0,
  max_trades_per_day INTEGER NOT NULL DEFAULT 3,
  trades_remaining_today INTEGER NOT NULL DEFAULT 3,
  open_trade BOOLEAN NOT NULL DEFAULT false,
  loss_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.vault_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vault state"
  ON public.vault_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault state"
  ON public.vault_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault state"
  ON public.vault_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_vault_state_updated_at
  BEFORE UPDATE ON public.vault_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: Get or initialize today's vault state
CREATE OR REPLACE FUNCTION public.get_or_create_vault_state(_user_id UUID)
RETURNS SETOF public.vault_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := CURRENT_DATE;
  _rules RECORD;
BEGIN
  -- Try to return existing state for today
  IF EXISTS (SELECT 1 FROM vault_state WHERE user_id = _user_id AND date = _today) THEN
    RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = _today;
    RETURN;
  END IF;

  -- Get user's trading rules for defaults
  SELECT max_daily_loss, max_risk_per_trade, max_trades_per_day
    INTO _rules
    FROM trading_rules
    WHERE user_id = _user_id
    LIMIT 1;

  -- Insert new state for today using trading_rules defaults
  INSERT INTO vault_state (user_id, date, daily_loss_limit, max_trades_per_day, trades_remaining_today, risk_remaining_today)
  VALUES (
    _user_id,
    _today,
    COALESCE(_rules.max_daily_loss, 3),
    COALESCE(_rules.max_trades_per_day, 3),
    COALESCE(_rules.max_trades_per_day, 3),
    COALESCE(_rules.max_daily_loss, 3)
  );

  RETURN QUERY SELECT * FROM vault_state WHERE user_id = _user_id AND date = _today;
END;
$$;
