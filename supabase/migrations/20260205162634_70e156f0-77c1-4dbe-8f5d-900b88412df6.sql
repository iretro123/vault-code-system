-- Fix search_path for the validation function
create or replace function public.validate_focus_session_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if NEW.status not in ('ACTIVE', 'ENDED') then
    raise exception 'Invalid status: must be ACTIVE or ENDED';
  end if;
  return NEW;
end;
$$;