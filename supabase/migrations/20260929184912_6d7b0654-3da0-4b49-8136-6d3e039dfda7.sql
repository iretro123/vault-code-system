-- RLS owner-update policies are row-scoped, not column-scoped. Keep moderation
-- flags out of ordinary profile edits. INVOKER is intentional: trusted security-
-- definer membership functions and service-role administration still work.
CREATE OR REPLACE FUNCTION public.guard_profile_access_flags()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND NOT public.has_role(auth.uid(),'operator'::public.app_role) THEN
  IF TG_OP='INSERT' THEN
   IF coalesce(NEW.is_banned,false) OR coalesce(NEW.access_status,'trial') NOT IN ('trial','active') THEN
    RAISE EXCEPTION 'Access flags are managed by Vault administrators' USING ERRCODE='42501';
   END IF;
  ELSIF NEW.is_banned IS DISTINCT FROM OLD.is_banned OR NEW.access_status IS DISTINCT FROM OLD.access_status THEN
   RAISE EXCEPTION 'Access flags are managed by Vault administrators' USING ERRCODE='42501';
  END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_profile_access_flags() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_profile_access_flags BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_access_flags();