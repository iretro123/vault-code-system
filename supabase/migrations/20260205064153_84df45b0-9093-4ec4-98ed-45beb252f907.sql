-- Drop existing function to change return type
DROP FUNCTION IF EXISTS public.calculate_position_size(uuid, numeric, numeric, numeric);

-- Recreate calculate_position_size with adaptive risk enforcement
CREATE OR REPLACE FUNCTION public.calculate_position_size(
  _user_id uuid,
  _account_size numeric,
  _risk_percent numeric,
  _stop_loss_percent numeric
)
RETURNS TABLE(
  allowed boolean,
  reason text,
  adaptive_risk_limit numeric,
  requested_risk numeric,
  position_size numeric,
  max_loss_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_adaptive RECORD;
  v_allowed BOOLEAN := FALSE;
  v_reason TEXT := '';
  v_adaptive_limit NUMERIC := 0;
  v_max_loss_amount NUMERIC := 0;
  v_position_size NUMERIC := 0;
BEGIN
  -- Validate input parameters
  IF _account_size <= 0 THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Account size must be greater than zero'::text,
      0::numeric,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  IF _stop_loss_percent <= 0 THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Stop loss percentage must be greater than zero'::text,
      0::numeric,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  IF _risk_percent <= 0 THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Risk percentage must be greater than zero'::text,
      0::numeric,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- Get adaptive risk limit as the authority source
  SELECT * INTO v_adaptive
  FROM get_adaptive_risk_limit(_user_id);
  
  IF v_adaptive IS NULL THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Unable to retrieve adaptive risk limit'::text,
      0::numeric,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- Set adaptive limit from authority function
  v_adaptive_limit := v_adaptive.adaptive_risk_limit;
  
  -- Check if risk level is LOCKED
  IF v_adaptive.risk_level = 'LOCKED' THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Trading is locked due to discipline status'::text,
      v_adaptive_limit,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- Enforce adaptive risk limit
  IF _risk_percent > v_adaptive_limit THEN
    v_reason := format('Risk exceeds adaptive risk limit based on discipline (%.2f%% > %.2f%% at %s level)', 
      _risk_percent, v_adaptive_limit, v_adaptive.risk_level);
    
    RETURN QUERY SELECT 
      FALSE::boolean,
      v_reason,
      v_adaptive_limit,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- Calculate position sizing
  -- max_loss_amount = account_size * (risk_percent / 100)
  v_max_loss_amount := _account_size * (_risk_percent / 100);
  
  -- position_size = max_loss_amount / (stop_loss_percent / 100)
  v_position_size := v_max_loss_amount / (_stop_loss_percent / 100);
  
  -- All checks passed
  v_allowed := TRUE;
  v_reason := format('Position calculated within %s risk level', v_adaptive.risk_level);
  
  RETURN QUERY SELECT 
    v_allowed,
    v_reason,
    v_adaptive_limit,
    _risk_percent,
    ROUND(v_position_size, 2),
    ROUND(v_max_loss_amount, 2);
END;
$$;

-- Update documentation
COMMENT ON FUNCTION public.calculate_position_size IS 'Vault Risk Engine: Calculates position size using adaptive risk limits from get_adaptive_risk_limit(). Enforces discipline-based risk reduction.';