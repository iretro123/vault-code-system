
-- Rewrite get_micro_feedback to use behavior_stats + daily_memory (14-day lookback)
-- Rules-based templates only, no advice tone, no shame
CREATE OR REPLACE FUNCTION public.get_micro_feedback(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stats RECORD;
  _recent RECORD;
  _risk_mode TEXT;
  _most_common_block TEXT;
BEGIN
  -- Get behavior stats
  SELECT * INTO _stats FROM behavior_stats WHERE user_id = _user_id;

  -- Get 14-day aggregates from daily_memory
  SELECT
    COUNT(*) AS days,
    COALESCE(SUM(trades_taken), 0) AS trades,
    COALESCE(SUM(trades_blocked), 0) AS blocks,
    COALESCE(SUM(CASE WHEN final_vault_status = 'RED' THEN 1 ELSE 0 END), 0) AS red_days,
    COALESCE(ROUND(AVG(trades_taken)::NUMERIC, 1), 0) AS avg_trades,
    COALESCE(SUM(CASE WHEN risk_mode = 'AGGRESSIVE' AND final_vault_status = 'RED' THEN 1 ELSE 0 END), 0) AS aggressive_red_days,
    COALESCE(SUM(CASE WHEN risk_mode = 'AGGRESSIVE' THEN 1 ELSE 0 END), 0) AS aggressive_days
  INTO _recent
  FROM daily_memory
  WHERE user_id = _user_id
    AND date >= CURRENT_DATE - 14;

  -- Need at least 3 days of data
  IF _recent.days < 3 THEN
    RETURN NULL;
  END IF;

  -- Get current risk mode
  SELECT risk_mode INTO _risk_mode
    FROM vault_state WHERE user_id = _user_id AND date = CURRENT_DATE;

  -- Template priority (first match wins):

  -- 1. Aggressive mode correlation with red days
  IF _recent.aggressive_days >= 2 AND _recent.aggressive_red_days > 0
     AND _recent.aggressive_red_days::NUMERIC / _recent.aggressive_days > 0.4 THEN
    RETURN 'Aggressive mode increases restrictions.';
  END IF;

  -- 2. High block rate driven by oversizing
  _most_common_block := COALESCE(_stats.most_common_block, '');
  IF _most_common_block ILIKE '%contract%' OR _most_common_block ILIKE '%exceed%' THEN
    IF _recent.blocks > 2 THEN
      RETURN 'Oversizing drives most blocked trades.';
    END IF;
  END IF;

  -- 3. Risk limit is the primary block reason
  IF _most_common_block ILIKE '%risk%' OR _most_common_block ILIKE '%daily%' THEN
    IF _recent.blocks > 2 THEN
      RETURN 'Most blocks are from exceeding daily risk.';
    END IF;
  END IF;

  -- 4. Low trade count correlates with fewer red days
  IF _recent.avg_trades <= 2 AND _recent.red_days = 0 THEN
    RETURN 'You perform best when trading ≤ 2 times.';
  END IF;

  -- 5. High trade frequency correlates with more losses
  IF _recent.avg_trades > 2.5 AND _recent.red_days >= 2 THEN
    RETURN 'Losses increase after the third trade.';
  END IF;

  -- 6. Clean streak
  IF _recent.red_days = 0 AND _recent.blocks = 0 AND _recent.days >= 5 THEN
    RETURN _recent.days || ' consecutive clean days.';
  END IF;

  -- 7. Red day rate observation
  IF _recent.days >= 5 AND _recent.red_days::NUMERIC / _recent.days > 0.3 THEN
    RETURN 'Red days occur ' || ROUND(_recent.red_days::NUMERIC / _recent.days * 100) || '% of the time.';
  END IF;

  -- 8. Blocks are frequent
  IF _recent.blocks > 0 AND _recent.trades > 0
     AND _recent.blocks::NUMERIC / (_recent.trades + _recent.blocks) > 0.3 THEN
    RETURN ROUND(_recent.blocks::NUMERIC / (_recent.trades + _recent.blocks) * 100) || '% of trade attempts are blocked.';
  END IF;

  RETURN NULL;
END;
$$;
