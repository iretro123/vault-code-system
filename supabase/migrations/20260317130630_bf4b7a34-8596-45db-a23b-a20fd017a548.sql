CREATE OR REPLACE FUNCTION public.validate_risk_percent_override()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.risk_percent_override IS NOT NULL AND (NEW.risk_percent_override < 1 OR NEW.risk_percent_override > 3) THEN
    RAISE EXCEPTION 'risk_percent_override must be between 1 and 3, got %', NEW.risk_percent_override;
  END IF;
  RETURN NEW;
END;
$$;