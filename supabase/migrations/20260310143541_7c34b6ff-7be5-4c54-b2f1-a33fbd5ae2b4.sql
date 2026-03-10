ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_discipline_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_discipline_status_check
  CHECK (discipline_status = ANY (ARRAY['active', 'inactive', 'locked']));