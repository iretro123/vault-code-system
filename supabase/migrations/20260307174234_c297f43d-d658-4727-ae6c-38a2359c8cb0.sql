-- 1. Update inbox_on_coach_reply with UPSERT logic
CREATE OR REPLACE FUNCTION public.inbox_on_coach_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ticket_user_id UUID;
  _question TEXT;
  _op RECORD;
  _existing_id UUID;
BEGIN
  IF NEW.is_admin = true THEN
    SELECT user_id, question INTO _ticket_user_id, _question
    FROM public.coach_tickets WHERE id = NEW.ticket_id;

    SELECT id INTO _existing_id
    FROM public.inbox_items
    WHERE user_id = _ticket_user_id
      AND sender_id = NEW.user_id
      AND type = 'coach_reply'
      AND read_at IS NULL
    ORDER BY created_at DESC LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      UPDATE public.inbox_items
      SET title = NEW.user_name || ' replied',
          body = 'Re: ' || LEFT(COALESCE(_question, 'Your question'), 100),
          created_at = NOW()
      WHERE id = _existing_id;
    ELSE
      INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id)
      VALUES (_ticket_user_id, 'coach_reply', NEW.user_name || ' replied',
        'Re: ' || LEFT(COALESCE(_question, 'Your question'), 100),
        '/academy/my-questions', NEW.user_id);
    END IF;
  ELSE
    SELECT question INTO _question
    FROM public.coach_tickets WHERE id = NEW.ticket_id;

    FOR _op IN SELECT user_id FROM public.user_roles WHERE role = 'operator'
    LOOP
      SELECT id INTO _existing_id
      FROM public.inbox_items
      WHERE user_id = _op.user_id
        AND sender_id = NEW.user_id
        AND type = 'coach_reply'
        AND read_at IS NULL
      ORDER BY created_at DESC LIMIT 1;

      IF _existing_id IS NOT NULL THEN
        UPDATE public.inbox_items
        SET title = NEW.user_name || ' replied to a question',
            body = 'Re: ' || LEFT(COALESCE(_question, 'A question'), 100),
            created_at = NOW()
        WHERE id = _existing_id;
      ELSE
        INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id)
        VALUES (_op.user_id, 'coach_reply', NEW.user_name || ' replied to a question',
          'Re: ' || LEFT(COALESCE(_question, 'A question'), 100),
          '/academy/admin/panel', NEW.user_id);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Update notify_operators_on_new_ticket with UPSERT logic
CREATE OR REPLACE FUNCTION public.notify_operators_on_new_ticket()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _sender_name TEXT;
  _op RECORD;
  _existing_id UUID;
BEGIN
  SELECT COALESCE(display_name, email, 'A member') INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;

  FOR _op IN SELECT user_id FROM public.user_roles WHERE role = 'operator'
  LOOP
    SELECT id INTO _existing_id
    FROM public.inbox_items
    WHERE user_id = _op.user_id
      AND sender_id = NEW.user_id
      AND type = 'coach_reply'
      AND read_at IS NULL
    ORDER BY created_at DESC LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      UPDATE public.inbox_items
      SET title = _sender_name || ' asked a question',
          body = LEFT(NEW.question, 120),
          created_at = NOW()
      WHERE id = _existing_id;
    ELSE
      INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id)
      VALUES (_op.user_id, 'coach_reply', _sender_name || ' asked a question',
        LEFT(NEW.question, 120), '/academy/admin/panel', NEW.user_id);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

-- 3. Update notify_user_on_operator_dm with UPSERT logic
CREATE OR REPLACE FUNCTION public.notify_user_on_operator_dm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_thread_user_id uuid;
  v_sender_name text;
  v_is_operator boolean;
  v_existing_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.sender_id AND role = 'operator'
  ) INTO v_is_operator;

  IF NOT v_is_operator THEN RETURN NEW; END IF;

  SELECT user_id INTO v_thread_user_id
  FROM public.dm_threads WHERE id = NEW.thread_id;

  IF v_thread_user_id IS NULL OR v_thread_user_id = NEW.sender_id THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, 'Vault Academy') INTO v_sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;

  SELECT id INTO v_existing_id
  FROM public.inbox_items
  WHERE user_id = v_thread_user_id
    AND sender_id = NEW.sender_id
    AND type = 'coach_reply'
    AND read_at IS NULL
  ORDER BY created_at DESC LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.inbox_items
    SET title = 'New message from ' || v_sender_name,
        body = LEFT(NEW.body, 120),
        created_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.inbox_items (user_id, type, title, body, sender_id, pinned)
    VALUES (v_thread_user_id, 'coach_reply', 'New message from ' || v_sender_name,
      LEFT(NEW.body, 120), NEW.sender_id, false);
  END IF;
  RETURN NEW;
END;
$function$;