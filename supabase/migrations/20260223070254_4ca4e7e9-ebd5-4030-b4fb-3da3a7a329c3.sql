
-- Table to persist user's last reading position
CREATE TABLE public.user_playbook_state (
  user_id uuid NOT NULL PRIMARY KEY,
  last_chapter_id uuid REFERENCES public.playbook_chapters(id),
  last_page_viewed integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_playbook_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own playbook state"
  ON public.user_playbook_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playbook state"
  ON public.user_playbook_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playbook state"
  ON public.user_playbook_state FOR UPDATE
  USING (auth.uid() = user_id);
