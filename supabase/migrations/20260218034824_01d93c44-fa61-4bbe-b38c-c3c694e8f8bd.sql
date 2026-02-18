
-- Chat mutes (timeouts)
CREATE TABLE public.chat_mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  muted_by uuid NOT NULL,
  muted_until timestamptz NOT NULL,
  room_slug text, -- null = global mute
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can manage mutes"
  ON public.chat_mutes FOR ALL
  USING (has_academy_permission(auth.uid(), 'moderate_chat'))
  WITH CHECK (has_academy_permission(auth.uid(), 'moderate_chat'));

CREATE POLICY "Users can read own mutes"
  ON public.chat_mutes FOR SELECT
  USING (auth.uid() = user_id);

-- Room locks
CREATE TABLE public.room_locks (
  room_slug text PRIMARY KEY,
  locked_by uuid NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read room locks"
  ON public.room_locks FOR SELECT
  USING (true);

CREATE POLICY "Moderators can manage room locks"
  ON public.room_locks FOR INSERT
  WITH CHECK (has_academy_permission(auth.uid(), 'moderate_chat'));

CREATE POLICY "Moderators can delete room locks"
  ON public.room_locks FOR DELETE
  USING (has_academy_permission(auth.uid(), 'moderate_chat'));

-- Pinned messages
CREATE TABLE public.pinned_messages (
  room_slug text PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.academy_messages(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL,
  pinned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pinned messages"
  ON public.pinned_messages FOR SELECT
  USING (true);

CREATE POLICY "Moderators can pin messages"
  ON public.pinned_messages FOR INSERT
  WITH CHECK (has_academy_permission(auth.uid(), 'moderate_chat'));

CREATE POLICY "Moderators can update pins"
  ON public.pinned_messages FOR UPDATE
  USING (has_academy_permission(auth.uid(), 'moderate_chat'));

CREATE POLICY "Moderators can unpin messages"
  ON public.pinned_messages FOR DELETE
  USING (has_academy_permission(auth.uid(), 'moderate_chat'));
