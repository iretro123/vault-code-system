
-- Academy lessons table for storing video content
CREATE TABLE public.academy_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text NOT NULL,
  module_title text NOT NULL,
  lesson_title text NOT NULL,
  video_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read lessons
CREATE POLICY "Authenticated users can read lessons"
ON public.academy_lessons FOR SELECT
TO authenticated
USING (true);

-- Only operators can insert
CREATE POLICY "Operators can insert lessons"
ON public.academy_lessons FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'operator'::app_role));

-- Only operators can update
CREATE POLICY "Operators can update lessons"
ON public.academy_lessons FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'operator'::app_role));

-- Only operators can delete
CREATE POLICY "Operators can delete lessons"
ON public.academy_lessons FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'operator'::app_role));

-- Index for fast module lookups
CREATE INDEX idx_academy_lessons_module ON public.academy_lessons(module_slug, sort_order);
