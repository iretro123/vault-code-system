-- Populate through authenticated administration, never embed room capabilities
-- in migrations or VITE_ variables (which become public JavaScript).
CREATE TABLE public.vault_classroom_links (
 classroom text PRIMARY KEY CHECK(classroom IN ('trading','wednesday')),
 join_url text NOT NULL CHECK(join_url LIKE 'https://%'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vault_classroom_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vault_classroom_links FROM anon,authenticated;
GRANT SELECT ON public.vault_classroom_links TO authenticated;
GRANT ALL ON public.vault_classroom_links TO service_role;
CREATE POLICY "Current members can read classroom links" ON public.vault_classroom_links FOR SELECT TO authenticated USING(public.has_current_full_access());
