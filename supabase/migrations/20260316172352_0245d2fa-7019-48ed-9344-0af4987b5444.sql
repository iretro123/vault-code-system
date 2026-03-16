
-- Drop the old duplicate trigger from coach_tickets
DROP TRIGGER IF EXISTS trg_notify_operators_new_ticket ON public.coach_tickets;

-- Drop the old function (no longer needed)
DROP FUNCTION IF EXISTS public.notify_operators_on_new_ticket();
