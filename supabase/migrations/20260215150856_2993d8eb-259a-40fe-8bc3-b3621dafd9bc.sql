-- Add access_status to profiles
ALTER TABLE public.profiles
ADD COLUMN access_status text NOT NULL DEFAULT 'trial';

-- Add a check constraint via trigger for valid values
CREATE OR REPLACE FUNCTION public.validate_access_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.access_status NOT IN ('trial', 'active', 'revoked') THEN
    RAISE EXCEPTION 'Invalid access_status: %. Must be trial, active, or revoked.', NEW.access_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_access_status
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_access_status();