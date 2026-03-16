
-- 1) Update inbox_on_new_coach_ticket to also bridge into DM system
CREATE OR REPLACE FUNCTION public.inbox_on_new_coach_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _op RECORD;
  _sender_name TEXT;
  _thread_id UUID;
BEGIN
  -- Get the submitter's display name
  SELECT display_name INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  -- Find or create a DM thread for this student
  SELECT id INTO _thread_id
  FROM public.dm_threads WHERE user_id = NEW.user_id
  LIMIT 1;

  IF _thread_id IS NULL THEN
    INSERT INTO public.dm_threads (user_id)
    VALUES (NEW.user_id)
    RETURNING id INTO _thread_id;
  END IF;

  -- Insert the question as a DM message (sender = student)
  INSERT INTO public.dm_messages (thread_id, sender_id, body)
  VALUES (_thread_id, NEW.user_id, '[Ask Coach · ' || NEW.category || '] ' || NEW.question);

  -- Update thread timestamp
  UPDATE public.dm_threads SET last_message_at = now() WHERE id = _thread_id;

  -- Notify all operators via inbox
  FOR _op IN
    SELECT ur.user_id
    FROM public.academy_user_roles ur
    JOIN public.academy_roles r ON r.id = ur.role_id
    JOIN public.academy_role_permissions rp ON rp.role_id = r.id
    WHERE rp.permission_key = 'manage_users'
      AND ur.user_id != NEW.user_id
  LOOP
    INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id, dm_thread_id)
    VALUES (
      _op.user_id,
      'coach_reply',
      'New question from ' || COALESCE(_sender_name, 'a student'),
      LEFT(NEW.question, 150),
      '/academy/admin',
      NEW.user_id,
      _thread_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 2) Create/update inbox_on_coach_reply to also bridge replies into DM system
CREATE OR REPLACE FUNCTION public.inbox_on_coach_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket_user_id UUID;
  _thread_id UUID;
  _admin_name TEXT;
BEGIN
  -- Only act on admin replies
  IF NEW.is_admin = false THEN
    RETURN NEW;
  END IF;

  -- Get the ticket owner
  SELECT user_id INTO _ticket_user_id
  FROM public.coach_tickets WHERE id = NEW.ticket_id;

  IF _ticket_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get admin display name
  SELECT display_name INTO _admin_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  -- Find or create DM thread for the student
  SELECT id INTO _thread_id
  FROM public.dm_threads WHERE user_id = _ticket_user_id
  LIMIT 1;

  IF _thread_id IS NULL THEN
    INSERT INTO public.dm_threads (user_id)
    VALUES (_ticket_user_id)
    RETURNING id INTO _thread_id;
  END IF;

  -- Insert the reply as a DM message (sender = admin)
  INSERT INTO public.dm_messages (thread_id, sender_id, body)
  VALUES (_thread_id, NEW.user_id, NEW.body);

  -- Update thread timestamp
  UPDATE public.dm_threads SET last_message_at = now() WHERE id = _thread_id;

  -- Notify the student via inbox
  INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id, dm_thread_id)
  VALUES (
    _ticket_user_id,
    'coach_reply',
    'Coach ' || COALESCE(_admin_name, 'RZ') || ' replied',
    LEFT(NEW.body, 150),
    '/academy/my-questions',
    NEW.user_id,
    _thread_id
  );

  RETURN NEW;
END;
$$;

-- Ensure the reply trigger exists
DROP TRIGGER IF EXISTS trg_inbox_coach_reply ON public.coach_ticket_replies;
CREATE TRIGGER trg_inbox_coach_reply
  AFTER INSERT ON public.coach_ticket_replies
  FOR EACH ROW EXECUTE FUNCTION public.inbox_on_coach_reply();
