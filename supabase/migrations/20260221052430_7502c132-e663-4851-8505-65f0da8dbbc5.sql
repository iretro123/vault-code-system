
-- Add thread support to academy_messages
ALTER TABLE public.academy_messages
  ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES public.academy_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reply_count integer NOT NULL DEFAULT 0;

-- Index for fast thread lookups
CREATE INDEX IF NOT EXISTS idx_academy_messages_parent ON public.academy_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- Function to auto-increment reply_count on parent when a reply is inserted
CREATE OR REPLACE FUNCTION public.increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_message_id IS NOT NULL THEN
    UPDATE public.academy_messages
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_message_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_increment_reply_count
  AFTER INSERT ON public.academy_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_reply_count();

-- Decrement on delete
CREATE OR REPLACE FUNCTION public.decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.parent_message_id IS NOT NULL THEN
    UPDATE public.academy_messages
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.parent_message_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_decrement_reply_count
  AFTER DELETE ON public.academy_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_reply_count();
