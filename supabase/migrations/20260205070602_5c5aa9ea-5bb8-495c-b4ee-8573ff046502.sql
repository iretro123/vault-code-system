-- Create Vault Feedback Engine function
CREATE OR REPLACE FUNCTION public.get_vault_feedback(_user_id uuid)
RETURNS TABLE(
  feedback_message text,
  feedback_type text,
  priority integer,
  recommended_action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_vault_score INTEGER := 0;
  v_discipline_score INTEGER := 0;
  v_violations_7d INTEGER := 0;
  v_trades_7d INTEGER := 0;
  v_avg_emotion NUMERIC := 3;
  v_avg_risk_used NUMERIC := 0;
  v_max_risk_per_trade NUMERIC := 1;
  v_streak_days INTEGER := 0;
  v_trades_today INTEGER := 0;
  v_max_trades INTEGER := 3;
  v_daily_loss_used NUMERIC := 0;
  v_max_daily_loss NUMERIC := 3;
  v_recent_blocks INTEGER := 0;
  v_tier TEXT := 'LOCKED';
  v_trend TEXT := 'stable';
  v_feedback_msg TEXT := '';
  v_feedback_type TEXT := 'neutral';
  v_priority INTEGER := 3;
  v_action TEXT := '';
  v_rules RECORD;
  v_score_data RECORD;
BEGIN
  -- Get trading rules
  SELECT * INTO v_rules FROM trading_rules WHERE user_id = _user_id;
  
  IF v_rules IS NULL THEN
    RETURN QUERY SELECT 
      'Configure your trading rules to activate the Vault.'::text,
      'warning'::text,
      1::integer,
      'Go to Rules page and set your trading limits.'::text;
    RETURN;
  END IF;

  v_max_risk_per_trade := v_rules.max_risk_per_trade;
  v_max_trades := v_rules.max_trades_per_day;
  v_max_daily_loss := v_rules.max_daily_loss;

  -- Get vault score data
  SELECT * INTO v_score_data FROM calculate_vault_score(_user_id);
  IF v_score_data IS NOT NULL THEN
    v_vault_score := COALESCE(v_score_data.score, 0);
    v_tier := COALESCE(v_score_data.tier, 'LOCKED');
    v_trend := COALESCE(v_score_data.trend, 'stable');
  END IF;

  -- Get discipline score
  SELECT COALESCE(p.discipline_score, 0) INTO v_discipline_score
  FROM profiles p WHERE p.user_id = _user_id;

  -- Get 7-day metrics
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN NOT te.followed_rules THEN 1 ELSE 0 END), 0),
    COALESCE(AVG(te.emotional_state), 3),
    COALESCE(AVG(te.risk_used), 0)
  INTO v_trades_7d, v_violations_7d, v_avg_emotion, v_avg_risk_used
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= CURRENT_DATE - INTERVAL '7 days';

  -- Get streak days
  WITH daily_compliance AS (
    SELECT te.trade_date, BOOL_AND(te.followed_rules) as all_compliant
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

  -- Get today's metrics
  SELECT COUNT(*), COALESCE(SUM(te.risk_used), 0)
  INTO v_trades_today, v_daily_loss_used
  FROM trade_entries te
  WHERE te.user_id = _user_id AND te.trade_date = CURRENT_DATE;

  -- Get recent trade blocks
  SELECT COUNT(*) INTO v_recent_blocks
  FROM vault_events ve
  WHERE ve.user_id = _user_id 
    AND ve.event_type = 'trade_blocked'
    AND ve.created_at >= NOW() - INTERVAL '24 hours';

  -- ============================================
  -- FEEDBACK LOGIC - Priority based analysis
  -- ============================================

  -- CRITICAL: Vault Score extremely low
  IF v_vault_score < 30 THEN
    v_feedback_type := 'critical';
    v_priority := 1;
    v_feedback_msg := 'Your Vault Score is critically low at ' || v_vault_score || '. Trading is suspended until you rebuild discipline.';
    v_action := 'Stop trading immediately. Review your recent violations and wait for daily reset.';
    
  -- CRITICAL: Multiple violations today
  ELSIF v_violations_7d >= 3 AND v_trades_7d > 0 THEN
    v_feedback_type := 'critical';
    v_priority := 1;
    v_feedback_msg := 'You have ' || v_violations_7d || ' rule violations in the past 7 days. This pattern threatens your trading privileges.';
    v_action := 'Pause trading and identify the root cause of your rule breaks. Consider reducing position sizes.';

  -- CRITICAL: Emotional instability detected
  ELSIF v_avg_emotion <= 1.5 OR v_avg_emotion >= 4.5 THEN
    v_feedback_type := 'critical';
    v_priority := 1;
    v_feedback_msg := 'Extreme emotional states detected (avg: ' || ROUND(v_avg_emotion, 1) || '/5). This indicates high-risk trading behavior.';
    v_action := 'Do not trade when emotionally compromised. Take a break and reassess your mental state.';

  -- CRITICAL: Recent trade blocks
  ELSIF v_recent_blocks >= 3 THEN
    v_feedback_type := 'critical';
    v_priority := 1;
    v_feedback_msg := 'The Vault has blocked ' || v_recent_blocks || ' trade attempts in the last 24 hours. You are pushing against your limits.';
    v_action := 'Accept the daily limits. Overtrading destroys discipline and profits.';

  -- WARNING: Vault Score in danger zone
  ELSIF v_vault_score < 50 THEN
    v_feedback_type := 'warning';
    v_priority := 2;
    v_feedback_msg := 'Your Vault Score of ' || v_vault_score || ' is in the DANGEROUS zone. One more violation could lock you out.';
    v_action := 'Trade with extreme caution. Follow your rules exactly and consider reducing risk by 50%.';

  -- WARNING: Approaching daily limits
  ELSIF v_trades_today >= v_max_trades - 1 OR v_daily_loss_used >= v_max_daily_loss * 0.8 THEN
    v_feedback_type := 'warning';
    v_priority := 2;
    v_feedback_msg := 'You are approaching your daily limits. Trades: ' || v_trades_today || '/' || v_max_trades || ', Risk: ' || ROUND(v_daily_loss_used, 1) || '%/' || v_max_daily_loss || '%.';
    v_action := 'Make your remaining trades count. Ensure each setup meets all criteria before entry.';

  -- WARNING: Risk usage too high
  ELSIF v_avg_risk_used > v_max_risk_per_trade * 0.9 THEN
    v_feedback_type := 'warning';
    v_priority := 2;
    v_feedback_msg := 'Your average risk per trade (' || ROUND(v_avg_risk_used, 2) || '%) is near your maximum allowed (' || v_max_risk_per_trade || '%).';
    v_action := 'Consider trading smaller to leave margin for error. Discipline compounds over time.';

  -- WARNING: Declining trend
  ELSIF v_trend = 'declining' THEN
    v_feedback_type := 'warning';
    v_priority := 2;
    v_feedback_msg := 'Your 7-day trend is declining. Recent trading patterns show increasing violations or blocked trades.';
    v_action := 'Identify what changed in your approach. Return to fundamentals and strict rule adherence.';

  -- POSITIVE: Elite performance
  ELSIF v_vault_score >= 85 AND v_streak_days >= 5 THEN
    v_feedback_type := 'positive';
    v_priority := 4;
    v_feedback_msg := 'ELITE performance! Vault Score: ' || v_vault_score || ' with a ' || v_streak_days || '-day compliance streak.';
    v_action := 'Maintain this discipline. Consider documenting what is working so well.';

  -- POSITIVE: Strong and improving
  ELSIF v_vault_score >= 70 AND v_trend = 'improving' THEN
    v_feedback_type := 'positive';
    v_priority := 4;
    v_feedback_msg := 'Strong performance with improving trend. Your Vault Score of ' || v_vault_score || ' shows consistent discipline.';
    v_action := 'Keep following your system. You are building sustainable trading habits.';

  -- POSITIVE: Building streak
  ELSIF v_streak_days >= 3 AND v_violations_7d = 0 THEN
    v_feedback_type := 'positive';
    v_priority := 4;
    v_feedback_msg := 'Excellent! ' || v_streak_days || ' consecutive days of perfect rule adherence.';
    v_action := 'Protect this streak. Each compliant day compounds your discipline score.';

  -- NEUTRAL: Stable performance
  ELSIF v_vault_score >= 50 THEN
    v_feedback_type := 'neutral';
    v_priority := 3;
    v_feedback_msg := 'Your Vault Score of ' || v_vault_score || ' is stable. Room for improvement exists in ' || 
      CASE 
        WHEN v_avg_emotion < 2.5 OR v_avg_emotion > 3.5 THEN 'emotional management'
        WHEN v_violations_7d > 0 THEN 'rule adherence'
        ELSE 'consistency'
      END || '.';
    v_action := 'Focus on one improvement area at a time. Small gains compound into significant progress.';

  -- NEUTRAL: New or inactive user
  ELSIF v_trades_7d = 0 THEN
    v_feedback_type := 'neutral';
    v_priority := 3;
    v_feedback_msg := 'No trades logged in the past 7 days. Your discipline system awaits activation.';
    v_action := 'When you trade next, use the Pre-Trade Check to ensure full compliance.';

  -- DEFAULT: General guidance
  ELSE
    v_feedback_type := 'neutral';
    v_priority := 3;
    v_feedback_msg := 'Your Vault Score is ' || v_vault_score || '. Continue following your rules to build discipline.';
    v_action := 'Log each trade honestly and review your patterns regularly.';
  END IF;

  RETURN QUERY SELECT v_feedback_msg, v_feedback_type, v_priority, v_action;
END;
$function$;