-- Align the basic/free mini-course with the current Vault OS naming.
UPDATE public.academy_modules
SET
  title = 'Getting Started',
  subtitle = 'A free starter course for new Vault OS traders.',
  sort_order = 0,
  visible = true,
  basic_only = true
WHERE slug = 'chapter-1-basic-bridge';

UPDATE public.academy_lessons
SET module_title = 'Getting Started'
WHERE module_slug = 'chapter-1-basic-bridge';
