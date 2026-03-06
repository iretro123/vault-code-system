ALTER TABLE public.academy_modules ADD COLUMN visible boolean NOT NULL DEFAULT true;
ALTER TABLE public.academy_lessons ADD COLUMN visible boolean NOT NULL DEFAULT true;