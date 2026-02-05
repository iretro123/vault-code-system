-- Update enforce_trade_permission trigger to log successful trades
CREATE OR REPLACE FUNCTION public.enforce_trade_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_permission RECORD;
BEGIN
  -- Call the authority function to check trade permission
  SELECT * INTO v_permission
  FROM check_trade_permission(NEW.user_id);
  
  -- If trading is not allowed, block the insert with the reason
  IF v_permission.can_trade = FALSE THEN
    RAISE EXCEPTION 'Trade blocked: %', v_permission.reason
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Permission granted - log the trade execution
  PERFORM log_vault_event(
    NEW.user_id,
    'trade_executed',
    jsonb_build_object(
      'trade_id', NEW.id,
      'risk_used', NEW.risk_used,
      'followed_rules', NEW.followed_rules,
      'timestamp', now()
    )
  );
  
  -- Allow the insert
  RETURN NEW;
END;
$function$;

-- Add documentation
COMMENT ON FUNCTION public.enforce_trade_permission IS 'Trigger function that enforces trade permissions and logs successful trade executions.';