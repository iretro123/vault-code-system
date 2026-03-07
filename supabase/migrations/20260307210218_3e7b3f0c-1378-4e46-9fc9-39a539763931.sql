-- Add dm_thread_id column to inbox_items for direct thread linking
ALTER TABLE public.inbox_items ADD COLUMN dm_thread_id uuid REFERENCES public.dm_threads(id) ON DELETE SET NULL;

-- Update trigger: when operator sends DM, store thread_id on inbox item
CREATE OR REPLACE FUNCTION public.notify_user_on_operator_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT user_id INTO v_thread_user_id FROM public.dm_threads WHERE id = NEW.thread_id;
  IF v_thread_user_id IS NULL OR v_thread_user_id = NEW.sender_id THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, 'Vault Academy') INTO v_sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;

  SELECT id INTO v_existing_id FROM public.inbox_items
  WHERE user_id = v_thread_user_id AND sender_id = NEW.sender_id AND type = 'coach_reply'
  ORDER BY created_at DESC LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.inbox_items
    SET title = 'New message from ' || v_sender_name,
        body = LEFT(NEW.body, 120),
        created_at = NOW(), read_at = NULL,
        dm_thread_id = NEW.thread_id
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.inbox_items (user_id, type, title, body, sender_id, pinned, dm_thread_id)
    VALUES (v_thread_user_id, 'coach_reply', 'New message from ' || v_sender_name,
      LEFT(NEW.body, 120), NEW.sender_id, false, NEW.thread_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Update trigger: when member sends DM, store thread_id on operator's inbox item
CREATE OR REPLACE FUNCTION public.notify_operators_on_dm_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_operator BOOLEAN;
  _sender_name TEXT;
  _op RECORD;
  _existing_id UUID;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.sender_id AND role = 'operator'
  ) INTO _is_operator;
  IF _is_operator THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, email, 'A member') INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;

  FOR _op IN SELECT user_id FROM public.user_roles WHERE role = 'operator'
  LOOP
    SELECT id INTO _existing_id
    FROM public.inbox_items
    WHERE user_id = _op.user_id AND sender_id = NEW.sender_id AND type = 'coach_reply'
    ORDER BY created_at DESC LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      UPDATE public.inbox_items
      SET title = _sender_name || ' sent a message',
          body = LEFT(NEW.body, 120),
          created_at = NOW(),
          read_at = NULL,
          dm_thread_id = NEW.thread_id
      WHERE id = _existing_id;
    ELSE
      INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id, dm_thread_id)
      VALUES (_op.user_id, 'coach_reply', _sender_name || ' sent a message',
        LEFT(NEW.body, 120), '/academy/admin/panel?tab=dms', NEW.sender_id, NEW.thread_id);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- Backfill existing DM inbox items with their thread IDs where possible
UPDATE public.inbox_items ii
SET dm_thread_id = dt.id
FROM public.dm_threads dt
WHERE ii.type = 'coach_reply'
  AND ii.dm_thread_id IS NULL
  AND ii.sender_id IS NOT NULL
  AND dt.user_id = ii.sender_id;

-- Also backfill where the inbox item's user_id is the thread's user_id (member's own items)
UPDATE public.inbox_items ii
SET dm_thread_id = dt.id
FROM public.dm_threads dt
WHERE ii.type = 'coach_reply'
  AND ii.dm_thread_id IS NULL
  AND dt.user_id = ii.user_id;