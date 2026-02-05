-- =============================================
-- DISCIPLINE SYNC FUNCTION
-- Updates profile discipline_status and score based on trade data
-- =============================================

CREATE OR REPLACE FUNCTION public.calculate_discipline_metrics(_user_id UUID)
RETURNS TABLE (
  discipline_status TEXT,
  discipline_score INTEGER,
  can_trade BOOLEAN,
  trades_today INTEGER,
  violations_today INTEGER,
  streak_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules RECORD;
  v_today DATE := CURRENT_DATE;
  v_trades_today INTEGER := 0;
  v_violations_today INTEGER := 0;
  v_total_risk_today DECIMAL := 0;
  v_streak_days INTEGER := 0;
  v_total_entries INTEGER := 0;
  v_compliant_entries INTEGER := 0;
  v_avg_emotion DECIMAL := 3;
  v_compliance_rate DECIMAL := 100;
  v_score INTEGER := 0;
  v_status TEXT := 'inactive';
  v_can_trade BOOLEAN := FALSE;
BEGIN
  -- Get user's trading rules
  SELECT * INTO v_rules FROM trading_rules WHERE user_id = _user_id;
  
  IF v_rules IS NULL THEN
    RETURN QUERY SELECT 'inactive'::TEXT, 0, FALSE, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Calculate today's metrics
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN NOT followed_rules THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(risk_used), 0)
  INTO v_trades_today, v_violations_today, v_total_risk_today
  FROM trade_entries 
  WHERE user_id = _user_id AND trade_date = v_today;
  
  -- Calculate streak (consecutive days with 100% compliance)
  WITH daily_compliance AS (
    SELECT 
      trade_date,
      BOOL_AND(followed_rules) as all_compliant
    FROM trade_entries
    WHERE user_id = _user_id
    GROUP BY trade_date
    ORDER BY trade_date DESC
  )
  SELECT COUNT(*) INTO v_streak_days
  FROM (
    SELECT trade_date, all_compliant,
           ROW_NUMBER() OVER (ORDER BY trade_date DESC) as rn
    FROM daily_compliance
  ) sub
  WHERE all_compliant = TRUE 
    AND rn = (SELECT COUNT(*) FROM daily_compliance dc2 
              WHERE dc2.trade_date >= sub.trade_date 
              AND dc2.all_compliant = TRUE);
  
  -- Calculate 30-day metrics
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN followed_rules THEN 1 ELSE 0 END), 0),
    COALESCE(AVG(emotional_state), 3)
  INTO v_total_entries, v_compliant_entries, v_avg_emotion
  FROM trade_entries 
  WHERE user_id = _user_id 
    AND trade_date >= v_today - INTERVAL '30 days';
  
  -- Calculate compliance rate
  IF v_total_entries > 0 THEN
    v_compliance_rate := (v_compliant_entries::DECIMAL / v_total_entries) * 100;
  END IF;
  
  -- Calculate discipline score (0-100)
  -- Compliance: 40%, Streak: 20%, Emotion: 20%, Risk Management: 20%
  v_score := ROUND(
    (v_compliance_rate * 0.4) +
    (LEAST(v_streak_days::DECIMAL / 7, 1) * 20) +
    (((v_avg_emotion - 1) / 4) * 20) +
    (CASE 
      WHEN v_trades_today >= v_rules.max_trades_per_day THEN 10
      WHEN v_total_risk_today >= v_rules.max_daily_loss THEN 10
      ELSE 20
    END)
  );
  
  -- Determine discipline status
  IF v_violations_today > 0 OR v_total_risk_today >= v_rules.max_daily_loss OR v_score < 30 THEN
    v_status := 'locked';
  ELSE
    v_status := 'active';
  END IF;
  
  -- Determine if user can trade
  v_can_trade := (
    v_status = 'active' AND
    v_trades_today < v_rules.max_trades_per_day AND
    v_total_risk_today < v_rules.max_daily_loss AND
    v_violations_today = 0
  );
  
  -- Update profile with calculated values
  UPDATE profiles 
  SET 
    discipline_status = v_status,
    discipline_score = v_score,
    updated_at = NOW()
  WHERE user_id = _user_id;
  
  RETURN QUERY SELECT v_status, v_score, v_can_trade, v_trades_today, v_violations_today, v_streak_days;
END;
$$;

-- =============================================
-- TRIGGER TO UPDATE DISCIPLINE ON NEW TRADE
-- =============================================

CREATE OR REPLACE FUNCTION public.update_discipline_on_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate discipline metrics after trade entry
  PERFORM calculate_discipline_metrics(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trade_entry_change
  AFTER INSERT OR UPDATE OR DELETE ON public.trade_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_discipline_on_trade();