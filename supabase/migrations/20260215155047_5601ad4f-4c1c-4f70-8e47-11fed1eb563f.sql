-- Academy modules table (admin-managed)
CREATE TABLE public.academy_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read modules" ON public.academy_modules
  FOR SELECT USING (true);
CREATE POLICY "Operators can insert modules" ON public.academy_modules
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Operators can update modules" ON public.academy_modules
  FOR UPDATE USING (has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Operators can delete modules" ON public.academy_modules
  FOR DELETE USING (has_role(auth.uid(), 'operator'::app_role));

-- Add notes column to lessons
ALTER TABLE public.academy_lessons ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

-- Lesson progress tracking
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Seed initial modules from the static list
INSERT INTO public.academy_modules (slug, title, subtitle, sort_order) VALUES
  ('discipline-foundations', 'Discipline Foundations', 'Build the mental framework for consistent execution', 1),
  ('risk-management', 'Risk Management Mastery', 'Position sizing, stop placement, and capital protection', 2),
  ('trading-psychology', 'Trading Psychology', 'Control emotions and eliminate revenge trading', 3),
  ('rulebook-workshop', 'Build Your Rulebook', 'Define, test, and refine your personal trading rules', 4),
  ('performance-tracking', 'Performance Tracking', 'Measure what matters and review with purpose', 5),
  ('advanced-discipline', 'Advanced Discipline', 'Elite-level consistency and process optimization', 6)
ON CONFLICT (slug) DO NOTHING;