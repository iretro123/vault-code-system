CREATE OR REPLACE FUNCTION public.notify_operators_on_dm_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_operator BOOLEAN;
  _sender_name TEXT;
  _op RECORD;
  _existing_id UUID;
BEGIN
  -- Check if sender is an operator — if so, skip
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

  -- For each operator, UPSERT: update existing unread item or insert new
  FOR _op IN
    SELECT user_id FROM public.user_roles WHERE role = 'operator'
  LOOP
    -- Check for existing unread inbox item from this sender
    SELECT id INTO _existing_id
    FROM public.inbox_items
    WHERE user_id = _op.user_id
      AND sender_id = NEW.sender_id
      AND type = 'coach_reply'
      AND read_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      -- Update existing: bump timestamp and body
      UPDATE public.inbox_items
      SET title = _sender_name || ' sent a message',
          body = LEFT(NEW.body, 120),
          created_at = NOW()
      WHERE id = _existing_id;
    ELSE
      -- Insert new
      INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id)
      VALUES (
        _op.user_id,
        'coach_reply',
        _sender_name || ' sent a message',
        LEFT(NEW.body, 120),
        '/academy/admin/panel?tab=dms',
        NEW.sender_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;