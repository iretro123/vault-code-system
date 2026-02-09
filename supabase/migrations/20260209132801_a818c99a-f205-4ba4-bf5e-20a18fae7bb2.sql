
-- Add last_activity_at to track trading activity for inactivity auto-pause
ALTER TABLE public.vault_state
ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update get_or_create_vault_state to return the new column
-- (It already returns *, so no function change needed)

-- Update submit_trade_intent to bump last_activity_at
CREATE OR REPLACE FUNCTION public.update_vault_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.vault_state
  SET last_activity_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on trade_intents insert (BUYING NOW / trade authorization)
CREATE TRIGGER trg_update_activity_on_intent
AFTER INSERT ON public.trade_intents
FOR EACH ROW
EXECUTE FUNCTION public.update_vault_activity();

-- Trigger on trade_intents update (SELL / CLOSE via status change)
CREATE TRIGGER trg_update_activity_on_intent_update
AFTER UPDATE ON public.trade_intents
FOR EACH ROW
EXECUTE FUNCTION public.update_vault_activity();
