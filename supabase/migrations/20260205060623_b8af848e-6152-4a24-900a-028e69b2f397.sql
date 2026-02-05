-- Create trigger function to enforce trade permissions at database level
CREATE OR REPLACE FUNCTION public.enforce_trade_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Permission granted - allow the insert
  RETURN NEW;
END;
$$;

-- Create the trigger on trade_entries table
DROP TRIGGER IF EXISTS enforce_trade_permission_trigger ON trade_entries;

CREATE TRIGGER enforce_trade_permission_trigger
  BEFORE INSERT ON trade_entries
  FOR EACH ROW
  EXECUTE FUNCTION enforce_trade_permission();