
-- =============================================================
-- Trigger 1: Notify operators when a member sends a DM message
-- (covers composed DMs, auto-DMs, and any future DM source)
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_operators_on_dm_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_operator BOOLEAN;
  _sender_name TEXT;
  _op RECORD;
BEGIN
  -- Check if sender is an operator — if so, skip (no self-notification)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.sender_id AND role = 'operator'
  ) INTO _is_operator;

  IF _is_operator THEN
    RETURN NEW;
  END IF;

  -- Get sender display name
  SELECT COALESCE(display_name, email, 'A member') INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;

  -- Insert one inbox_items row per operator
  FOR _op IN
    SELECT user_id FROM public.user_roles WHERE role = 'operator'
  LOOP
    INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id)
    VALUES (
      _op.user_id,
      'coach_reply',
      _sender_name || ' sent a message',
      LEFT(NEW.body, 120),
      '/academy/admin/panel?tab=dms',
      NEW.sender_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_operators_dm_message
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_operators_on_dm_message();

-- =============================================================
-- Trigger 2: Update existing coach reply trigger to ALSO notify
-- operators when a USER replies (is_admin = false)
-- =============================================================
CREATE OR REPLACE FUNCTION public.inbox_on_coach_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket_user_id UUID;
  _question TEXT;
  _op RECORD;
BEGIN
  IF NEW.is_admin = true THEN
    -- Existing behavior: notify the student who asked the question
    SELECT user_id, question INTO _ticket_user_id, _question
    FROM public.coach_tickets WHERE id = NEW.ticket_id;

    INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id)
    VALUES (
      _ticket_user_id,
      'coach_reply',
      NEW.user_name || ' replied',
      'Re: ' || LEFT(COALESCE(_question, 'Your question'), 100),
      '/academy/my-questions',
      NEW.user_id
    );
  ELSE
    -- NEW: notify all operators when a user replies
    SELECT question INTO _question
    FROM public.coach_tickets WHERE id = NEW.ticket_id;

    FOR _op IN
      SELECT user_id FROM public.user_roles WHERE role = 'operator'
    LOOP
      INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id)
      VALUES (
        _op.user_id,
        'coach_reply',
        NEW.user_name || ' replied to a question',
        'Re: ' || LEFT(COALESCE(_question, 'A question'), 100),
        '/academy/admin/panel',
        NEW.user_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================
-- Trigger 3: Notify operators when a member submits a new
-- coach ticket (Ask Coach question)
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_operators_on_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_name TEXT;
  _op RECORD;
BEGIN
  -- Get submitter display name
  SELECT COALESCE(display_name, email, 'A member') INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;

  -- Insert one inbox_items row per operator
  FOR _op IN
    SELECT user_id FROM public.user_roles WHERE role = 'operator'
  LOOP
    INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id)
    VALUES (
      _op.user_id,
      'coach_reply',
      _sender_name || ' asked a question',
      LEFT(NEW.question, 120),
      '/academy/admin/panel',
      NEW.user_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_operators_new_ticket
  AFTER INSERT ON public.coach_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_operators_on_new_ticket();
