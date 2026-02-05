
-- Create the vault mistake analysis function
CREATE OR REPLACE FUNCTION public.get_vault_mistake_analysis(_user_id uuid)
RETURNS TABLE(
  mistake_type text,
  severity text,
  description text,
  impact_score numeric,
  recommended_fix text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rules RECORD;
  v_adaptive RECORD;
  v_today DATE := CURRENT_DATE;
  v_30_days_ago DATE := CURRENT_DATE - INTERVAL '30 days';
  
  -- Metrics
  v_total_trades INTEGER := 0;
  v_violations INTEGER := 0;
  v_violation_rate NUMERIC := 0;
  v_emotional_stddev NUMERIC := 0;
  v_emotional_avg NUMERIC := 3;
  v_overtrading_days INTEGER := 0;
  v_high_risk_trades INTEGER := 0;
  v_revenge_trades INTEGER := 0;
  v_total_trading_days INTEGER := 0;
  
  -- Severity thresholds
  v_severity TEXT := 'low';
  v_impact NUMERIC := 0;
  
  -- Temporary storage for results
  v_mistakes JSONB := '[]'::jsonb;
BEGIN
  -- Get user's trading rules
  SELECT * INTO v_rules FROM trading_rules WHERE user_id = _user_id;
  
  IF v_rules IS NULL THEN
    RETURN QUERY SELECT 
      'no_rules'::text,
      'critical'::text,
      'Trading rules not configured'::text,
      100::numeric,
      'Configure your trading rules in Settings to enable mistake analysis'::text;
    RETURN;
  END IF;
  
  -- Get adaptive risk limit
  SELECT * INTO v_adaptive FROM get_adaptive_risk_limit(_user_id);
  
  -- ============================================
  -- CALCULATE METRICS (Last 30 days)
  -- ============================================
  
  -- Total trades and violations
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN NOT te.followed_rules THEN 1 ELSE 0 END), 0)
  INTO v_total_trades, v_violations
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= v_30_days_ago;
  
  -- Calculate violation rate
  IF v_total_trades > 0 THEN
    v_violation_rate := ROUND((v_violations::NUMERIC / v_total_trades) * 100, 1);
  END IF;
  
  -- Calculate emotional instability (standard deviation)
  SELECT 
    COALESCE(STDDEV(te.emotional_state), 0),
    COALESCE(AVG(te.emotional_state), 3)
  INTO v_emotional_stddev, v_emotional_avg
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= v_30_days_ago;
  
  -- Count overtrading days
  SELECT COUNT(*) INTO v_overtrading_days
  FROM (
    SELECT te.trade_date, COUNT(*) as trade_count
    FROM trade_entries te
    WHERE te.user_id = _user_id 
      AND te.trade_date >= v_30_days_ago
    GROUP BY te.trade_date
    HAVING COUNT(*) > v_rules.max_trades_per_day
  ) overtrading;
  
  -- Count total trading days
  SELECT COUNT(DISTINCT te.trade_date) INTO v_total_trading_days
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= v_30_days_ago;
  
  -- Count high risk trades (exceeding adaptive or max risk limit)
  SELECT COUNT(*) INTO v_high_risk_trades
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= v_30_days_ago
    AND te.risk_used > v_rules.max_risk_per_trade;
  
  -- Count revenge trading patterns (trades within 10 minutes after a blocking event or violation)
  SELECT COUNT(*) INTO v_revenge_trades
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= v_30_days_ago
    AND EXISTS (
      SELECT 1 
      FROM vault_events ve 
      WHERE ve.user_id = _user_id 
        AND ve.event_type IN ('trade_blocked', 'discipline_locked')
        AND ve.created_at < te.created_at
        AND te.created_at - ve.created_at <= INTERVAL '10 minutes'
    );
  
  -- Also check for trades right after violations
  SELECT v_revenge_trades + COUNT(*) INTO v_revenge_trades
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= v_30_days_ago
    AND EXISTS (
      SELECT 1 
      FROM trade_entries prev_te 
      WHERE prev_te.user_id = _user_id 
        AND prev_te.followed_rules = FALSE
        AND prev_te.created_at < te.created_at
        AND te.created_at - prev_te.created_at <= INTERVAL '10 minutes'
        AND prev_te.id != te.id
    );
  
  -- ============================================
  -- ANALYZE MISTAKES
  -- ============================================
  
  -- 1. VIOLATION RATE ANALYSIS
  IF v_total_trades > 0 AND v_violation_rate > 0 THEN
    IF v_violation_rate >= 30 THEN
      v_severity := 'critical';
      v_impact := 95;
    ELSIF v_violation_rate >= 20 THEN
      v_severity := 'high';
      v_impact := 75;
    ELSIF v_violation_rate >= 10 THEN
      v_severity := 'medium';
      v_impact := 50;
    ELSE
      v_severity := 'low';
      v_impact := 25;
    END IF;
    
    RETURN QUERY SELECT 
      'violation_rate'::text,
      v_severity,
      format('Rule violations in %.1f%% of trades (%s of %s trades)', 
        v_violation_rate, v_violations, v_total_trades)::text,
      v_impact,
      CASE 
        WHEN v_severity = 'critical' THEN 'Stop trading immediately. Your violation rate is destroying your discipline. Review every rule before each trade.'
        WHEN v_severity = 'high' THEN 'Reduce position sizes and slow down. Pre-commit to your rules by writing them before each session.'
        WHEN v_severity = 'medium' THEN 'Identify your most common violation. Focus on eliminating that one pattern first.'
        ELSE 'Minor violations detected. Stay vigilant and maintain your current discipline.'
      END::text;
  END IF;
  
  -- 2. EMOTIONAL INSTABILITY ANALYSIS
  IF v_total_trades >= 5 AND v_emotional_stddev > 0.5 THEN
    IF v_emotional_stddev >= 1.5 THEN
      v_severity := 'critical';
      v_impact := 90;
    ELSIF v_emotional_stddev >= 1.2 THEN
      v_severity := 'high';
      v_impact := 70;
    ELSIF v_emotional_stddev >= 0.8 THEN
      v_severity := 'medium';
      v_impact := 45;
    ELSE
      v_severity := 'low';
      v_impact := 20;
    END IF;
    
    RETURN QUERY SELECT 
      'emotional_instability'::text,
      v_severity,
      format('Emotional state variance of %.2f (avg: %.1f/5) indicates inconsistent trading psychology', 
        v_emotional_stddev, v_emotional_avg)::text,
      v_impact,
      CASE 
        WHEN v_severity = 'critical' THEN 'Your emotions are controlling your trading. Take a break from live trading and journal your emotional triggers.'
        WHEN v_severity = 'high' THEN 'High emotional swings detected. Create a pre-session checklist to verify your mental state before trading.'
        WHEN v_severity = 'medium' THEN 'Moderate emotional variance. Practice noting your emotional state before entry and exit.'
        ELSE 'Slight emotional variance. Continue monitoring and maintaining awareness.'
      END::text;
  END IF;
  
  -- 3. OVERTRADING ANALYSIS
  IF v_overtrading_days > 0 THEN
    IF v_total_trading_days > 0 THEN
      v_impact := ROUND((v_overtrading_days::NUMERIC / v_total_trading_days) * 100, 0);
    ELSE
      v_impact := 50;
    END IF;
    
    IF v_overtrading_days >= 5 THEN
      v_severity := 'critical';
      v_impact := GREATEST(v_impact, 85);
    ELSIF v_overtrading_days >= 3 THEN
      v_severity := 'high';
      v_impact := GREATEST(v_impact, 65);
    ELSIF v_overtrading_days >= 2 THEN
      v_severity := 'medium';
      v_impact := GREATEST(v_impact, 40);
    ELSE
      v_severity := 'low';
      v_impact := GREATEST(v_impact, 20);
    END IF;
    
    RETURN QUERY SELECT 
      'overtrading'::text,
      v_severity,
      format('Exceeded daily trade limit on %s days (limit: %s trades/day)', 
        v_overtrading_days, v_rules.max_trades_per_day)::text,
      v_impact,
      CASE 
        WHEN v_severity = 'critical' THEN 'Chronic overtrading detected. Reduce your daily limit by 1 trade and enforce a hard stop after reaching it.'
        WHEN v_severity = 'high' THEN 'Frequent overtrading. Set a timer or alarm when you reach 80% of your daily limit.'
        WHEN v_severity = 'medium' THEN 'Occasional overtrading. Review what triggers you to take extra trades.'
        ELSE 'Minor overtrading incident. Stay aware of your daily count.'
      END::text;
  END IF;
  
  -- 4. HIGH RISK TRADES ANALYSIS
  IF v_high_risk_trades > 0 THEN
    IF v_total_trades > 0 THEN
      v_impact := ROUND((v_high_risk_trades::NUMERIC / v_total_trades) * 100, 0);
    ELSE
      v_impact := 50;
    END IF;
    
    IF v_high_risk_trades >= 5 THEN
      v_severity := 'critical';
      v_impact := GREATEST(v_impact, 90);
    ELSIF v_high_risk_trades >= 3 THEN
      v_severity := 'high';
      v_impact := GREATEST(v_impact, 70);
    ELSIF v_high_risk_trades >= 2 THEN
      v_severity := 'medium';
      v_impact := GREATEST(v_impact, 45);
    ELSE
      v_severity := 'low';
      v_impact := GREATEST(v_impact, 25);
    END IF;
    
    RETURN QUERY SELECT 
      'high_risk_trading'::text,
      v_severity,
      format('%s trades exceeded your risk limit of %.1f%% per trade', 
        v_high_risk_trades, v_rules.max_risk_per_trade)::text,
      v_impact,
      CASE 
        WHEN v_severity = 'critical' THEN 'Dangerous risk behavior. Lower your max risk limit and use the position calculator for every trade without exception.'
        WHEN v_severity = 'high' THEN 'Repeated over-risking will destroy your account. Pre-calculate position size before every entry.'
        WHEN v_severity = 'medium' THEN 'Risk management slipping. Double-check your position sizes against your rules.'
        ELSE 'Minor risk exceedance. Stay disciplined with your sizing.'
      END::text;
  END IF;
  
  -- 5. REVENGE TRADING ANALYSIS
  IF v_revenge_trades > 0 THEN
    IF v_revenge_trades >= 5 THEN
      v_severity := 'critical';
      v_impact := 95;
    ELSIF v_revenge_trades >= 3 THEN
      v_severity := 'high';
      v_impact := 75;
    ELSIF v_revenge_trades >= 2 THEN
      v_severity := 'medium';
      v_impact := 50;
    ELSE
      v_severity := 'low';
      v_impact := 30;
    END IF;
    
    RETURN QUERY SELECT 
      'revenge_trading'::text,
      v_severity,
      format('%s trades detected within 10 minutes after a loss or violation', 
        v_revenge_trades)::text,
      v_impact,
      CASE 
        WHEN v_severity = 'critical' THEN 'Severe revenge trading pattern. Implement a mandatory 30-minute cooling period after any loss or violation.'
        WHEN v_severity = 'high' THEN 'Revenge trading is a major threat to your account. Walk away from your screen after losses.'
        WHEN v_severity = 'medium' THEN 'Revenge trading detected. Set a 15-minute timer after any negative outcome before considering new trades.'
        ELSE 'Occasional impulsive trades after losses. Build awareness of this pattern.'
      END::text;
  END IF;
  
  -- If no significant mistakes found
  IF v_total_trades = 0 THEN
    RETURN QUERY SELECT 
      'no_data'::text,
      'low'::text,
      'No trading data available for analysis'::text,
      0::numeric,
      'Start logging your trades to receive personalized mistake analysis'::text;
  ELSE
    -- Return a positive message if no mistakes
    RETURN QUERY SELECT 
      'clean_record'::text,
      'low'::text,
      'No significant trading mistakes detected in the last 30 days'::text,
      0::numeric,
      'Excellent discipline! Maintain your current approach and continue logging trades.'::text;
  END IF;
END;
$function$;
