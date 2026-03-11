
-- Leak 5: Trigger to sync trade_entries → vault_state
-- When a trade is logged, update vault_state: decrement trades_remaining, 
-- reduce risk_remaining, update loss_streak, and escalate vault_status

CREATE OR REPLACE FUNCTION public.sync_trade_entry_to_vault_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pnl numeric;
  _is_loss boolean;
  _new_loss_streak integer;
  _new_trades_remaining integer;
  _new_risk_remaining numeric;
  _new_vault_status text;
  _current_state record;
BEGIN
  -- Calculate P/L: risk_reward * risk_used
  _pnl := NEW.risk_reward * NEW.risk_used;
  _is_loss := (NEW.risk_reward < 0);

  -- Get current vault state for today
  SELECT * INTO _current_state
  FROM vault_state
  WHERE user_id = NEW.user_id
    AND date = CURRENT_DATE
  LIMIT 1;

  -- If no vault_state for today, skip (user hasn't initialized vault)
  IF _current_state IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate new values
  _new_trades_remaining := GREATEST(0, _current_state.trades_remaining_today - 1);
  _new_risk_remaining := GREATEST(0, _current_state.risk_remaining_today - NEW.risk_used);
  
  -- Loss streak: increment on loss, reset on win
  IF _is_loss THEN
    _new_loss_streak := _current_state.loss_streak + 1;
  ELSE
    _new_loss_streak := 0;
  END IF;

  -- Vault status escalation:
  -- RED if no trades remaining OR no risk remaining
  -- YELLOW if 2+ consecutive losses
  -- Otherwise keep current (don't downgrade from operator-set RED)
  IF _current_state.vault_status = 'RED' THEN
    _new_vault_status := 'RED'; -- Never downgrade from RED
  ELSIF _new_trades_remaining <= 0 OR _new_risk_remaining <= 0 THEN
    _new_vault_status := 'RED';
  ELSIF _new_loss_streak >= 2 THEN
    _new_vault_status := 'YELLOW';
  ELSE
    _new_vault_status := _current_state.vault_status;
  END IF;

  -- Update vault_state
  UPDATE vault_state
  SET trades_remaining_today = _new_trades_remaining,
      risk_remaining_today = _new_risk_remaining,
      loss_streak = _new_loss_streak,
      vault_status = _new_vault_status,
      last_block_reason = CASE
        WHEN _new_vault_status = 'RED' AND _current_state.vault_status <> 'RED'
          THEN 'Daily limit reached via trade log'
        WHEN _new_vault_status = 'YELLOW' AND _current_state.vault_status = 'GREEN'
          THEN '2 consecutive losses'
        ELSE _current_state.last_block_reason
      END,
      updated_at = now()
  WHERE user_id = NEW.user_id
    AND date = CURRENT_DATE;

  RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_sync_trade_entry_to_vault ON public.trade_entries;
CREATE TRIGGER trg_sync_trade_entry_to_vault
  AFTER INSERT ON public.trade_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_trade_entry_to_vault_state();
