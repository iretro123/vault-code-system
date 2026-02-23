
-- Playbook chapters (admin-managed content)
CREATE TABLE public.playbook_chapters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  minutes_estimate integer NOT NULL DEFAULT 5,
  pdf_page_start integer NOT NULL DEFAULT 1,
  pdf_page_end integer NOT NULL DEFAULT 1,
  checkpoint_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_type text NOT NULL DEFAULT 'none',
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.playbook_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read playbook chapters"
  ON public.playbook_chapters FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Operators can manage playbook chapters"
  ON public.playbook_chapters FOR ALL
  USING (has_role(auth.uid(), 'operator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operator'::app_role));

-- Playbook progress (per user per chapter)
CREATE TABLE public.playbook_progress (
  user_id uuid NOT NULL,
  chapter_id uuid NOT NULL REFERENCES public.playbook_chapters(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  last_page_viewed integer NOT NULL DEFAULT 0,
  time_in_reader_seconds integer NOT NULL DEFAULT 0,
  checkpoint_score integer NOT NULL DEFAULT 0,
  checkpoint_passed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id)
);

ALTER TABLE public.playbook_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own playbook progress"
  ON public.playbook_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playbook progress"
  ON public.playbook_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playbook progress"
  ON public.playbook_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Playbook notes (per user per chapter)
CREATE TABLE public.playbook_notes (
  user_id uuid NOT NULL,
  chapter_id uuid NOT NULL REFERENCES public.playbook_chapters(id) ON DELETE CASCADE,
  note_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id)
);

ALTER TABLE public.playbook_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own playbook notes"
  ON public.playbook_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playbook notes"
  ON public.playbook_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playbook notes"
  ON public.playbook_notes FOR UPDATE
  USING (auth.uid() = user_id);

-- Nudge dismissals (generic, reusable)
CREATE TABLE public.user_nudges_dismissed (
  user_id uuid NOT NULL,
  nudge_key text NOT NULL,
  dismissed_until timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  PRIMARY KEY (user_id, nudge_key)
);

ALTER TABLE public.user_nudges_dismissed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own nudge dismissals"
  ON public.user_nudges_dismissed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nudge dismissals"
  ON public.user_nudges_dismissed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nudge dismissals"
  ON public.user_nudges_dismissed FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nudge dismissals"
  ON public.user_nudges_dismissed FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for playbook PDF (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('playbook', 'playbook', false);

-- Only authenticated users can read playbook files
CREATE POLICY "Authenticated users can read playbook files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'playbook' AND auth.uid() IS NOT NULL);

-- Only operators can upload playbook files
CREATE POLICY "Operators can upload playbook files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'playbook' AND has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Operators can update playbook files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'playbook' AND has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Operators can delete playbook files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'playbook' AND has_role(auth.uid(), 'operator'::app_role));
