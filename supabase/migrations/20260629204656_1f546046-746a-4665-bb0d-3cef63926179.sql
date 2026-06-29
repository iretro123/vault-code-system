
-- Add basic-tier gating to academy modules
ALTER TABLE public.academy_modules
  ADD COLUMN IF NOT EXISTS basic_only boolean NOT NULL DEFAULT false;

-- Duplicate Chapter 2 (slug: risk-management) into a new basic-only "Chapter 1"
INSERT INTO public.academy_modules (slug, title, subtitle, sort_order, cover_image_url, visible, basic_only)
SELECT
  'chapter-1-basic-bridge',
  'Chapter 1 — Beginner Bridge',
  subtitle,
  0,
  cover_image_url,
  true,
  true
FROM public.academy_modules
WHERE slug = 'risk-management'
ON CONFLICT (slug) DO NOTHING;

-- Duplicate lessons from risk-management into the new basic-only module
INSERT INTO public.academy_lessons (module_slug, module_title, lesson_title, video_url, notes, sort_order, visible)
SELECT
  'chapter-1-basic-bridge',
  'Chapter 1 — Beginner Bridge',
  lesson_title,
  video_url,
  notes,
  sort_order,
  visible
FROM public.academy_lessons
WHERE module_slug = 'risk-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.academy_lessons WHERE module_slug = 'chapter-1-basic-bridge'
  );
