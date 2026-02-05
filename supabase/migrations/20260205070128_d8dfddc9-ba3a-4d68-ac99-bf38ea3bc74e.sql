-- Create Vault Score calculation function
CREATE OR REPLACE FUNCTION public.calculate_vault_score(_user_id uuid)
RETURNS TABLE(
  score integer,
  tier text,
  trend text,
  discipline_component numeric,
  adherence_component numeric,
  violation_component numeric,
  risk_component numeric,
  emotion_component numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_discipline_score INTEGER := 0;
  v_rule_adherence_rate NUMERIC := 0;
  v_violation_frequency INTEGER := 0;
  v_risk_compliance_rate NUMERIC := 0;
  v_emotional_avg NUMERIC := 3;
  v_total_trades_30d INTEGER := 0;
  v_compliant_trades_30d INTEGER := 0;
  v_violations_7d INTEGER := 0;
  v_trades_7d INTEGER := 0;
  v_risk_compliant_trades INTEGER := 0;
  v_final_score INTEGER := 0;
  v_tier TEXT := 'LOCKED';
  v_trend TEXT := 'stable';
  v_prev_score INTEGER := 0;
  v_disc_component NUMERIC := 0;
  v_adh_component NUMERIC := 0;
  v_viol_component NUMERIC := 0;
  v_risk_component NUMERIC := 0;
  v_emot_component NUMERIC := 0;
  v_rules RECORD;
BEGIN
  -- Get user's trading rules
  SELECT * INTO v_rules FROM trading_rules WHERE user_id = _user_id;
  
  IF v_rules IS NULL THEN
    RETURN QUERY SELECT 
      0::integer, 'LOCKED'::text, 'stable'::text,
      0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Get discipline score from profile
  SELECT COALESCE(p.discipline_score, 0) INTO v_discipline_score
  FROM profiles p WHERE p.user_id = _user_id;

  -- Calculate rule adherence rate (last 30 days)
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN te.followed_rules THEN 1 ELSE 0 END), 0)
  INTO v_total_trades_30d, v_compliant_trades_30d
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= CURRENT_DATE - INTERVAL '30 days';

  IF v_total_trades_30d > 0 THEN
    v_rule_adherence_rate := (v_compliant_trades_30d::NUMERIC / v_total_trades_30d) * 100;
  ELSE
    v_rule_adherence_rate := 100; -- No trades = no violations
  END IF;

  -- Calculate violation frequency (last 7 days)
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN NOT te.followed_rules THEN 1 ELSE 0 END), 0)
  INTO v_trades_7d, v_violations_7d
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= CURRENT_DATE - INTERVAL '7 days';

  -- Calculate risk compliance rate (trades within max risk per trade)
  SELECT COALESCE(SUM(CASE WHEN te.risk_used <= v_rules.max_risk_per_trade THEN 1 ELSE 0 END), 0)
  INTO v_risk_compliant_trades
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= CURRENT_DATE - INTERVAL '30 days';

  IF v_total_trades_30d > 0 THEN
    v_risk_compliance_rate := (v_risk_compliant_trades::NUMERIC / v_total_trades_30d) * 100;
  ELSE
    v_risk_compliance_rate := 100;
  END IF;

  -- Calculate emotional stability average (target is 3, range 1-5)
  SELECT COALESCE(AVG(te.emotional_state), 3)
  INTO v_emotional_avg
  FROM trade_entries te
  WHERE te.user_id = _user_id 
    AND te.trade_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Calculate weighted components
  -- Discipline score: 40% weight
  v_disc_component := (v_discipline_score::NUMERIC / 100) * 40;
  
  -- Rule adherence rate: 20% weight
  v_adh_component := (v_rule_adherence_rate / 100) * 20;
  
  -- Violation frequency: 15% weight (inverse - fewer violations = higher score)
  IF v_trades_7d > 0 THEN
    v_viol_component := (1 - (v_violations_7d::NUMERIC / v_trades_7d)) * 15;
  ELSE
    v_viol_component := 15; -- No trades = no violations
  END IF;
  
  -- Risk compliance rate: 15% weight
  v_risk_component := (v_risk_compliance_rate / 100) * 15;
  
  -- Emotional stability: 10% weight (3 is optimal, deviation reduces score)
  -- Score = 1 - abs(avg - 3) / 2 (so 3 = 100%, 1 or 5 = 0%)
  v_emot_component := GREATEST(0, (1 - ABS(v_emotional_avg - 3) / 2)) * 10;

  -- Calculate final score
  v_final_score := ROUND(v_disc_component + v_adh_component + v_viol_component + v_risk_component + v_emot_component);
  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  -- Determine tier
  IF v_final_score >= 85 THEN
    v_tier := 'ELITE';
  ELSIF v_final_score >= 70 THEN
    v_tier := 'STRONG';
  ELSIF v_final_score >= 50 THEN
    v_tier := 'DEVELOPING';
  ELSIF v_final_score >= 30 THEN
    v_tier := 'DANGEROUS';
  ELSE
    v_tier := 'LOCKED';
  END IF;

  -- Calculate trend based on recent vault events
  SELECT 
    CASE 
      WHEN COUNT(*) FILTER (WHERE ve.event_type IN ('discipline_recovered', 'trade_executed')) >
           COUNT(*) FILTER (WHERE ve.event_type IN ('discipline_locked', 'trade_blocked')) THEN 'improving'
      WHEN COUNT(*) FILTER (WHERE ve.event_type IN ('discipline_locked', 'trade_blocked')) >
           COUNT(*) FILTER (WHERE ve.event_type IN ('discipline_recovered', 'trade_executed')) THEN 'declining'
      ELSE 'stable'
    END
  INTO v_trend
  FROM vault_events ve
  WHERE ve.user_id = _user_id 
    AND ve.created_at >= NOW() - INTERVAL '7 days';

  -- Log score calculation event
  PERFORM log_vault_event(
    _user_id,
    'vault_score_calculated',
    jsonb_build_object(
      'score', v_final_score,
      'tier', v_tier,
      'trend', v_trend,
      'timestamp', now()
    )
  );

  RETURN QUERY SELECT 
    v_final_score,
    v_tier,
    v_trend,
    ROUND(v_disc_component, 1),
    ROUND(v_adh_component, 1),
    ROUND(v_viol_component, 1),
    ROUND(v_risk_component, 1),
    ROUND(v_emot_component, 1);
END;
$function$;