
-- Unified inbox_items table
CREATE TABLE public.inbox_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  type TEXT NOT NULL DEFAULT 'reminder',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;

-- Users see their own items + broadcast (user_id IS NULL)
CREATE POLICY "Users can read own or broadcast inbox items"
  ON public.inbox_items FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

-- System/triggers insert items
CREATE POLICY "Authenticated users can insert inbox items"
  ON public.inbox_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can mark their own items as read
CREATE POLICY "Users can update own inbox items"
  ON public.inbox_items FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Trigger: auto-create inbox_item when a coach reply is inserted
CREATE OR REPLACE FUNCTION public.inbox_on_coach_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket_user_id UUID;
  _question TEXT;
BEGIN
  IF NEW.is_admin = true THEN
    SELECT user_id, question INTO _ticket_user_id, _question
    FROM public.coach_tickets WHERE id = NEW.ticket_id;

    INSERT INTO public.inbox_items (user_id, type, title, body, link)
    VALUES (
      _ticket_user_id,
      'coach_reply',
      NEW.user_name || ' replied',
      'Re: ' || LEFT(COALESCE(_question, 'Your question'), 100),
      '/academy/my-questions'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inbox_coach_reply
  AFTER INSERT ON public.coach_ticket_replies
  FOR EACH ROW EXECUTE FUNCTION public.inbox_on_coach_reply();

-- Trigger: auto-create inbox_item when an announcement notification is inserted
CREATE OR REPLACE FUNCTION public.inbox_on_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inbox_items (user_id, type, title, body, link)
  VALUES (
    NEW.user_id,
    'announcement',
    NEW.title,
    NEW.body,
    NEW.link_path
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inbox_announcement
  AFTER INSERT ON public.academy_notifications
  FOR EACH ROW EXECUTE FUNCTION public.inbox_on_announcement();
