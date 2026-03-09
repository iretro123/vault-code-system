DROP TRIGGER IF EXISTS trg_message_rate_limit ON public.academy_messages;
DROP FUNCTION IF EXISTS public.check_message_rate_limit();