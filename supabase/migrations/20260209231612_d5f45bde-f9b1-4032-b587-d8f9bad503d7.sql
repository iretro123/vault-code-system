
CREATE OR REPLACE FUNCTION public.generate_reports_for_user(_user_id uuid, _period text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start date;
  _end date;
  _days_traded int;
  _green int;
  _yellow int;
  _red int;
  _trades_taken int;
  _trades_blocked int;
  _risk_used numeric;
  _risk_saved numeric;
  _avg_tpd numeric;
  _avg_rpt numeric;
  _block_rate numeric;
  _most_common text;
  _stability int;
  _mode_fit text;
  -- mode-fit variables
  _agg_days int;
  _agg_red_rate numeric;
  _agg_block_rate numeric;
  _std_days int;
  _std_green_rate numeric;
  _con_days int;
BEGIN
  IF _period NOT IN ('weekly', 'monthly') THEN
    RAISE EXCEPTION 'Invalid period: %. Must be weekly or monthly.', _period;
  END IF;

  IF _period = 'weekly' THEN
    _start := date_trunc('week', CURRENT_DATE)::date;
    _end := _start + 6;
  ELSE
    _start := date_trunc('month', CURRENT_DATE)::date;
    _end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date;
  END IF;

  -- Aggregate from daily_memory (period range)
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE (dm.trades_taken + dm.trades_blocked) > 0), 0),
    COALESCE(COUNT(*) FILTER (WHERE dm.final_vault_status = 'GREEN'), 0),
    COALESCE(COUNT(*) FILTER (WHERE dm.final_vault_status = 'YELLOW'), 0),
    COALESCE(COUNT(*) FILTER (WHERE dm.final_vault_status = 'RED'), 0),
    COALESCE(SUM(dm.trades_taken), 0),
    COALESCE(SUM(dm.trades_blocked), 0),
    COALESCE(SUM(dm.risk_used), 0),
    COALESCE(SUM(GREATEST(0, dm.account_balance * 0.02 - dm.risk_used)), 0)
  INTO _days_traded, _green, _yellow, _red, _trades_taken, _trades_blocked, _risk_used, _risk_saved
  FROM daily_memory dm
  WHERE dm.user_id = _user_id
    AND dm.date >= _start
    AND dm.date <= _end;

  _avg_tpd := ROUND(_trades_taken::numeric / GREATEST(_days_traded, 1), 2);
  _avg_rpt := ROUND(_risk_used / GREATEST(_trades_taken, 1), 2);
  _block_rate := ROUND(_trades_blocked::numeric / GREATEST(_trades_taken + _trades_blocked, 1), 4);

  SELECT ti.block_reason INTO _most_common
  FROM trade_intents ti
  WHERE ti.user_id = _user_id
    AND ti.status = 'BLOCKED'
    AND ti.block_reason IS NOT NULL
    AND ti.created_at::date >= _start
    AND ti.created_at::date <= _end
  GROUP BY ti.block_reason
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  _stability := GREATEST(0, LEAST(100,
    100 - (_red * 20) - (_yellow * 8) - (_block_rate * 30)::int
  ));

  -- ── Mode Fit: last 14-30 days from daily_memory ──
  _mode_fit := NULL;

  -- Aggressive: red_rate and block_rate
  SELECT
    COUNT(*),
    CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE dm.final_vault_status = 'RED')::numeric / COUNT(*), 4)
      ELSE 0 END,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(SUM(dm.trades_blocked)::numeric / GREATEST(SUM(dm.trades_taken) + SUM(dm.trades_blocked), 1), 4)
      ELSE 0 END
  INTO _agg_days, _agg_red_rate, _agg_block_rate
  FROM daily_memory dm
  WHERE dm.user_id = _user_id
    AND dm.risk_mode = 'AGGRESSIVE'
    AND dm.date >= CURRENT_DATE - 30;

  -- Standard: green_rate
  SELECT
    COUNT(*),
    CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE dm.final_vault_status = 'GREEN')::numeric / COUNT(*), 4)
      ELSE 0 END
  INTO _std_days, _std_green_rate
  FROM daily_memory dm
  WHERE dm.user_id = _user_id
    AND dm.risk_mode = 'STANDARD'
    AND dm.date >= CURRENT_DATE - 30;

  -- Conservative: days count
  SELECT COUNT(*) INTO _con_days
  FROM daily_memory dm
  WHERE dm.user_id = _user_id
    AND dm.risk_mode = 'CONSERVATIVE'
    AND dm.date >= CURRENT_DATE - 30;

  -- Decision tree (first match wins)
  IF _agg_days >= 2 AND (_agg_red_rate > 0.3 OR _agg_block_rate > 0.3) THEN
    _mode_fit := 'Aggressive increases restrictions for you';
  ELSIF _std_days >= 2 AND _std_green_rate >= 0.6 THEN
    _mode_fit := 'Standard fits you best right now';
  ELSE
    _mode_fit := 'Conservative keeps you stable';
  END IF;

  -- Upsert
  IF _period = 'weekly' THEN
    INSERT INTO weekly_report (
      user_id, period_start, period_end, days_traded, green_days, yellow_days, red_days,
      trades_taken, trades_blocked, risk_used, risk_saved,
      avg_trades_per_day, avg_risk_per_trade, block_rate,
      most_common_block_reason, stability_score, mode_fit
    ) VALUES (
      _user_id, _start, _end, _days_traded, _green, _yellow, _red,
      _trades_taken, _trades_blocked, _risk_used, _risk_saved,
      _avg_tpd, _avg_rpt, _block_rate,
      _most_common, _stability, _mode_fit
    )
    ON CONFLICT (user_id, period_start) DO UPDATE SET
      period_end = EXCLUDED.period_end,
      days_traded = EXCLUDED.days_traded,
      green_days = EXCLUDED.green_days,
      yellow_days = EXCLUDED.yellow_days,
      red_days = EXCLUDED.red_days,
      trades_taken = EXCLUDED.trades_taken,
      trades_blocked = EXCLUDED.trades_blocked,
      risk_used = EXCLUDED.risk_used,
      risk_saved = EXCLUDED.risk_saved,
      avg_trades_per_day = EXCLUDED.avg_trades_per_day,
      avg_risk_per_trade = EXCLUDED.avg_risk_per_trade,
      block_rate = EXCLUDED.block_rate,
      most_common_block_reason = EXCLUDED.most_common_block_reason,
      stability_score = EXCLUDED.stability_score,
      mode_fit = EXCLUDED.mode_fit;
  ELSE
    INSERT INTO monthly_report (
      user_id, period_start, period_end, days_traded, green_days, yellow_days, red_days,
      trades_taken, trades_blocked, risk_used, risk_saved,
      avg_trades_per_day, avg_risk_per_trade, block_rate,
      most_common_block_reason, stability_score, mode_fit
    ) VALUES (
      _user_id, _start, _end, _days_traded, _green, _yellow, _red,
      _trades_taken, _trades_blocked, _risk_used, _risk_saved,
      _avg_tpd, _avg_rpt, _block_rate,
      _most_common, _stability, _mode_fit
    )
    ON CONFLICT (user_id, period_start) DO UPDATE SET
      period_end = EXCLUDED.period_end,
      days_traded = EXCLUDED.days_traded,
      green_days = EXCLUDED.green_days,
      yellow_days = EXCLUDED.yellow_days,
      red_days = EXCLUDED.red_days,
      trades_taken = EXCLUDED.trades_taken,
      trades_blocked = EXCLUDED.trades_blocked,
      risk_used = EXCLUDED.risk_used,
      risk_saved = EXCLUDED.risk_saved,
      avg_trades_per_day = EXCLUDED.avg_trades_per_day,
      avg_risk_per_trade = EXCLUDED.avg_risk_per_trade,
      block_rate = EXCLUDED.block_rate,
      most_common_block_reason = EXCLUDED.most_common_block_reason,
      stability_score = EXCLUDED.stability_score,
      mode_fit = EXCLUDED.mode_fit;
  END IF;
END;
$$;
