
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.push_notify_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  pushable_types text[] := ARRAY['mention','rz_message','live_now','announcement','new_module','motivation'];
BEGIN
  IF NEW.type = ANY(pushable_types) THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://oemylhcjqncovnmvvgxh.supabase.co/functions/v1/push-notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-push-secret', 'F2aKEhdYTdIzpY23SDw5BRgFdVQ66fAukAXlIr50EzCvPXD0ycCMb4mUH4VkPLpM'
        ),
        body := jsonb_build_object('notification_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'push_notify_on_insert failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_notify_on_insert ON public.academy_notifications;
CREATE TRIGGER push_notify_on_insert
AFTER INSERT ON public.academy_notifications
FOR EACH ROW
EXECUTE FUNCTION public.push_notify_on_insert();
