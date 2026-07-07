
-- Helper: can current user manage calendar posts (admin/CEO/operator)
CREATE OR REPLACE FUNCTION public.can_manage_calendar_posts(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'operator'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.academy_user_roles aur
      JOIN public.academy_roles ar ON ar.id = aur.role_id
      WHERE aur.user_id = _user_id
        AND ar.name IN ('CEO','Admin')
    );
$$;

CREATE TABLE public.calendar_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  image_path text,
  caption text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX calendar_posts_created_at_idx ON public.calendar_posts (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_posts TO authenticated;
GRANT ALL ON public.calendar_posts TO service_role;

ALTER TABLE public.calendar_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view calendar posts"
  ON public.calendar_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert calendar posts"
  ON public.calendar_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.can_manage_calendar_posts(auth.uid())
  );

CREATE POLICY "Managers can update calendar posts"
  ON public.calendar_posts FOR UPDATE
  TO authenticated
  USING (public.can_manage_calendar_posts(auth.uid()))
  WITH CHECK (public.can_manage_calendar_posts(auth.uid()));

CREATE POLICY "Managers can delete calendar posts"
  ON public.calendar_posts FOR DELETE
  TO authenticated
  USING (public.can_manage_calendar_posts(auth.uid()));
