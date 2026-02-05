-- Create adaptive risk limit function
-- Dynamically adjusts risk limits based on discipline score
-- Uses get_vault_status() as the authority source

CREATE OR REPLACE FUNCTION public.get_adaptive_risk_limit(_user_id uuid)
RETURNS TABLE(
  adaptive_risk_limit numeric,
  risk_level text,
  adjustment_factor numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status RECORD;
  v_adaptive_limit NUMERIC := 0;
  v_risk_level TEXT := 'LOCKED';
  v_adjustment NUMERIC := 0;
BEGIN
  -- Get vault status from authority function
  SELECT * INTO v_status
  FROM get_vault_status(_user_id);

  IF v_status IS NULL THEN
    RETURN QUERY SELECT
      0::numeric,
      'LOCKED'::text,
      0::numeric;
    RETURN;
  END IF;

  -- Apply adaptive risk logic based on discipline status and score
  IF v_status.discipline_status = 'locked' THEN
    -- Locked: No trading allowed
    v_adaptive_limit := 0;
    v_risk_level := 'LOCKED';
    v_adjustment := 0;
  ELSIF v_status.discipline_score >= 80 THEN
    -- Elite: Full risk allowance
    v_adaptive_limit := v_status.max_risk_per_trade;
    v_risk_level := 'FULL';
    v_adjustment := 1.0;
  ELSIF v_status.discipline_score >= 60 THEN
    -- Consistent: 75% risk allowance
    v_adaptive_limit := v_status.max_risk_per_trade * 0.75;
    v_risk_level := 'REDUCED';
    v_adjustment := 0.75;
  ELSIF v_status.discipline_score >= 40 THEN
    -- Developing: 50% risk allowance
    v_adaptive_limit := v_status.max_risk_per_trade * 0.50;
    v_risk_level := 'RESTRICTED';
    v_adjustment := 0.50;
  ELSE
    -- Undisciplined: 25% risk allowance
    v_adaptive_limit := v_status.max_risk_per_trade * 0.25;
    v_risk_level := 'MINIMAL';
    v_adjustment := 0.25;
  END IF;

  RETURN QUERY SELECT
    ROUND(v_adaptive_limit, 2),
    v_risk_level,
    v_adjustment;
END;
$$;

-- Add documentation
COMMENT ON FUNCTION public.get_adaptive_risk_limit IS 'Adaptive Risk Engine: Dynamically adjusts risk limits based on discipline score. Authority source for all risk calculations.';