-- Fix ambiguous column reference in calculate_discipline_metrics
CREATE OR REPLACE FUNCTION public.calculate_discipline_metrics(_user_id uuid)
RETURNS TABLE(discipline_status text, discipline_score integer, can_trade boolean, trades_today integer, violations_today integer, streak_days integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_previous_status TEXT := NULL;
BEGIN
  -- Get user's trading rules
  SELECT * INTO v_rules FROM trading_rules WHERE trading_rules.user_id = _user_id;
  
  IF v_rules IS NULL THEN
    RETURN QUERY SELECT 'inactive'::TEXT, 0, FALSE, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Get previous discipline status for comparison
  SELECT p.discipline_status INTO v_previous_status
  FROM profiles p
  WHERE p.user_id = _user_id;
  
  -- Calculate today's metrics
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN NOT te.followed_rules THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(te.risk_used), 0)
  INTO v_trades_today, v_violations_today, v_total_risk_today
  FROM trade_entries te
  WHERE te.user_id = _user_id AND te.trade_date = v_today;
  
  -- Calculate streak (consecutive days with 100% compliance)
  WITH daily_compliance AS (
    SELECT 
      te.trade_date,
      BOOL_AND(te.followed_rules) as all_compliant
    FROM trade_entries te
    WHERE te.user_id = _user_id
    GROUP BY te.trade_date
    ORDER BY te.trade_date DESC
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
    COALESCE(SUM(CASE WHEN te.followed_rules THEN 1 ELSE 0 END), 0),
    COALESCE(AVG(te.emotional_state), 3)
  INTO v_total_entries, v_compliant_entries, v_avg_emotion
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= v_today - INTERVAL '30 days';
  
  -- Calculate compliance rate
  IF v_total_entries > 0 THEN
    v_compliance_rate := (v_compliant_entries::DECIMAL / v_total_entries) * 100;
  END IF;
  
  -- Calculate discipline score (0-100)
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
  
  -- LOG EVENT: When discipline becomes locked
  IF v_status = 'locked' AND (v_previous_status IS NULL OR v_previous_status != 'locked') THEN
    PERFORM log_vault_event(
      _user_id,
      'discipline_locked',
      jsonb_build_object(
        'discipline_score', v_score,
        'violations_today', v_violations_today,
        'timestamp', now()
      )
    );
  END IF;
  
  -- LOG EVENT: When discipline recovers from locked to active
  IF v_status = 'active' AND v_previous_status = 'locked' THEN
    PERFORM log_vault_event(
      _user_id,
      'discipline_recovered',
      jsonb_build_object(
        'discipline_score', v_score,
        'timestamp', now()
      )
    );
  END IF;
  
  -- Update profile with calculated values
  UPDATE profiles p
  SET 
    discipline_status = v_status,
    discipline_score = v_score,
    updated_at = NOW()
  WHERE p.user_id = _user_id;
  
  RETURN QUERY SELECT v_status, v_score, v_can_trade, v_trades_today, v_violations_today, v_streak_days;
END;
$function$;