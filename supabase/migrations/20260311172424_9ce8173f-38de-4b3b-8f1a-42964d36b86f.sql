
-- Reverse vault_state when a trade_entry is deleted
-- Also revert linked approved_plan from 'logged' back to 'planned'

CREATE OR REPLACE FUNCTION public.reverse_trade_entry_from_vault_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_state record;
  _new_trades_remaining integer;
  _new_risk_remaining numeric;
  _new_loss_streak integer;
  _new_vault_status text;
  _consecutive_losses integer;
BEGIN
  -- Only reverse for today's trades
  IF OLD.trade_date <> CURRENT_DATE::text THEN
    RETURN OLD;
  END IF;

  -- Get current vault state for today
  SELECT * INTO _current_state
  FROM vault_state
  WHERE user_id = OLD.user_id
    AND date = CURRENT_DATE
  LIMIT 1;

  IF _current_state IS NULL THEN
    -- Revert plan even if no vault state
    IF OLD.plan_id IS NOT NULL THEN
      UPDATE approved_plans SET status = 'planned', updated_at = now()
      WHERE id = OLD.plan_id::uuid AND status = 'logged';
    END IF;
    RETURN OLD;
  END IF;

  -- Restore trades remaining (cap at max)
  _new_trades_remaining := LEAST(
    _current_state.trades_remaining_today + 1,
    _current_state.max_trades_per_day
  );

  -- Restore risk remaining (cap at daily loss limit)
  _new_risk_remaining := LEAST(
    _current_state.risk_remaining_today + OLD.risk_used,
    _current_state.daily_loss_limit
  );

  -- Recalculate loss streak from remaining today's trades
  SELECT COUNT(*) INTO _consecutive_losses
  FROM (
    SELECT risk_reward,
           ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
    FROM trade_entries
    WHERE user_id = OLD.user_id
      AND trade_date = CURRENT_DATE::text
      AND id <> OLD.id
  ) sub
  WHERE sub.risk_reward < 0
    AND sub.rn <= (
      SELECT COUNT(*) FROM trade_entries
      WHERE user_id = OLD.user_id
        AND trade_date = CURRENT_DATE::text
        AND id <> OLD.id
        AND risk_reward < 0
        AND created_at >= COALESCE(
          (SELECT MAX(created_at) FROM trade_entries
           WHERE user_id = OLD.user_id
             AND trade_date = CURRENT_DATE::text
             AND id <> OLD.id
             AND risk_reward >= 0),
          '1970-01-01'::timestamptz
        )
    );

  _new_loss_streak := _consecutive_losses;

  -- Recalculate vault status
  IF _new_trades_remaining <= 0 OR _new_risk_remaining <= 0 THEN
    _new_vault_status := 'RED';
  ELSIF _new_loss_streak >= 2 THEN
    _new_vault_status := 'YELLOW';
  ELSE
    _new_vault_status := 'GREEN';
  END IF;

  -- Update vault_state
  UPDATE vault_state
  SET trades_remaining_today = _new_trades_remaining,
      risk_remaining_today = _new_risk_remaining,
      loss_streak = _new_loss_streak,
      vault_status = _new_vault_status,
      last_block_reason = CASE
        WHEN _new_vault_status = 'GREEN' THEN NULL
        WHEN _new_vault_status = 'YELLOW' THEN '2 consecutive losses'
        ELSE _current_state.last_block_reason
      END,
      updated_at = now()
  WHERE user_id = OLD.user_id
    AND date = CURRENT_DATE;

  -- Revert linked approved plan
  IF OLD.plan_id IS NOT NULL THEN
    UPDATE approved_plans SET status = 'planned', updated_at = now()
    WHERE id = OLD.plan_id::uuid AND status = 'logged';
  END IF;

  RETURN OLD;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_reverse_trade_entry_from_vault ON public.trade_entries;
CREATE TRIGGER trg_reverse_trade_entry_from_vault
  AFTER DELETE ON public.trade_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_trade_entry_from_vault_state();
