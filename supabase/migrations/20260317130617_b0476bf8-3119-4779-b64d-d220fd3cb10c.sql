ALTER TABLE public.user_preferences ADD COLUMN risk_percent_override integer DEFAULT NULL;

-- Validation trigger: clamp to 1-3 or NULL
CREATE OR REPLACE FUNCTION public.validate_risk_percent_override()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.risk_percent_override IS NOT NULL AND (NEW.risk_percent_override < 1 OR NEW.risk_percent_override > 3) THEN
    RAISE EXCEPTION 'risk_percent_override must be between 1 and 3, got %', NEW.risk_percent_override;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_risk_percent_override
BEFORE INSERT OR UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.validate_risk_percent_override();