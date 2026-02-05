-- Add columns for Trade Logger 1.0
ALTER TABLE public.trade_entries
ADD COLUMN IF NOT EXISTS symbol TEXT,
ADD COLUMN IF NOT EXISTS instrument_type TEXT,
ADD COLUMN IF NOT EXISTS outcome TEXT;

-- Create validation trigger for new columns
CREATE OR REPLACE FUNCTION public.validate_trade_entry_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate instrument_type if provided
  IF NEW.instrument_type IS NOT NULL AND NEW.instrument_type NOT IN ('options', 'futures') THEN
    RAISE EXCEPTION 'Invalid instrument_type: must be options or futures';
  END IF;
  
  -- Validate outcome if provided
  IF NEW.outcome IS NOT NULL AND NEW.outcome NOT IN ('WIN', 'LOSS', 'BREAKEVEN') THEN
    RAISE EXCEPTION 'Invalid outcome: must be WIN, LOSS, or BREAKEVEN';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_trade_entry_fields_trigger ON public.trade_entries;

CREATE TRIGGER validate_trade_entry_fields_trigger
BEFORE INSERT OR UPDATE ON public.trade_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_trade_entry_fields();