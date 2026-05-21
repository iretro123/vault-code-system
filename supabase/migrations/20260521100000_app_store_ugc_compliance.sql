-- App Store Guideline 1.2 compliance: user reporting and blocking for UGC.

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.academy_messages(id) ON DELETE SET NULL,
  room_slug text,
  reason text NOT NULL DEFAULT 'Objectionable content',
  message_snapshot text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create content reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own content reports"
  ON public.content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Operators can manage content reports"
  ON public.content_reports FOR ALL
  USING (public.has_role(auth.uid(), 'operator'::public.app_role) OR public.has_role(auth.uid(), 'vault_os_owner'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'operator'::public.app_role) OR public.has_role(auth.uid(), 'vault_os_owner'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created ON public.content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user ON public.content_reports(reported_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_user_id),
  CHECK (blocker_id <> blocked_user_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own blocks"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view own blocks"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can delete own blocks"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

CREATE POLICY "Operators can view user blocks"
  ON public.user_blocks FOR SELECT
  USING (public.has_role(auth.uid(), 'operator'::public.app_role) OR public.has_role(auth.uid(), 'vault_os_owner'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_user_id, created_at DESC);
