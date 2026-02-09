
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
BEGIN
  IF _period NOT IN ('weekly', 'monthly') THEN
    RAISE EXCEPTION 'Invalid period: %. Must be weekly or monthly.', _period;
  END IF;

  -- Determine period range
  IF _period = 'weekly' THEN
    -- Monday to Sunday of the current week
    _start := date_trunc('week', CURRENT_DATE)::date;
    _end := _start + 6;
  ELSE
    _start := date_trunc('month', CURRENT_DATE)::date;
    _end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date;
  END IF;

  -- Aggregate from daily_memory
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

  -- Derived metrics
  _avg_tpd := ROUND(_trades_taken::numeric / GREATEST(_days_traded, 1), 2);
  _avg_rpt := ROUND(_risk_used / GREATEST(_trades_taken, 1), 2);
  _block_rate := ROUND(_trades_blocked::numeric / GREATEST(_trades_taken + _trades_blocked, 1), 4);

  -- Most common block reason from trade_intents
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

  -- Stability score
  _stability := GREATEST(0, LEAST(100,
    100 - (_red * 20) - (_yellow * 8) - (_block_rate * 30)::int
  ));

  -- Upsert into the correct table
  IF _period = 'weekly' THEN
    INSERT INTO weekly_report (
      user_id, period_start, period_end, days_traded, green_days, yellow_days, red_days,
      trades_taken, trades_blocked, risk_used, risk_saved,
      avg_trades_per_day, avg_risk_per_trade, block_rate,
      most_common_block_reason, stability_score
    ) VALUES (
      _user_id, _start, _end, _days_traded, _green, _yellow, _red,
      _trades_taken, _trades_blocked, _risk_used, _risk_saved,
      _avg_tpd, _avg_rpt, _block_rate,
      _most_common, _stability
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
      stability_score = EXCLUDED.stability_score;
  ELSE
    INSERT INTO monthly_report (
      user_id, period_start, period_end, days_traded, green_days, yellow_days, red_days,
      trades_taken, trades_blocked, risk_used, risk_saved,
      avg_trades_per_day, avg_risk_per_trade, block_rate,
      most_common_block_reason, stability_score
    ) VALUES (
      _user_id, _start, _end, _days_traded, _green, _yellow, _red,
      _trades_taken, _trades_blocked, _risk_used, _risk_saved,
      _avg_tpd, _avg_rpt, _block_rate,
      _most_common, _stability
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
      stability_score = EXCLUDED.stability_score;
  END IF;
END;
$$;
