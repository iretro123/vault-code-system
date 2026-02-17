
-- Trigger: auto-create inbox_item when a new module is published
CREATE OR REPLACE FUNCTION public.inbox_on_new_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inbox_items (user_id, type, title, body, link)
  VALUES (
    NULL,
    'new_module',
    '📚 New module: ' || NEW.title,
    COALESCE(NEW.subtitle, ''),
    '/academy/learn'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inbox_new_module
  AFTER INSERT ON public.academy_modules
  FOR EACH ROW EXECUTE FUNCTION public.inbox_on_new_module();

-- Trigger: auto-create inbox_item when a live session is scheduled
CREATE OR REPLACE FUNCTION public.inbox_on_live_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inbox_items (user_id, type, title, body, link)
  VALUES (
    NULL,
    'live_scheduled',
    '📡 ' || NEW.title,
    COALESCE(NEW.description, ''),
    '/academy/live'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inbox_live_session
  AFTER INSERT ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.inbox_on_live_session();
