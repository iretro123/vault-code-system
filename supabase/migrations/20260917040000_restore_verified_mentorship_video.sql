-- Verified against the existing Chapter 9 lesson and RZ's public YouTube
-- channel (@rubenzamora__). Only fill this exact empty Chapter 7 record;
-- preserve existing URLs, lesson IDs, visibility, and student progress.
UPDATE public.academy_lessons
SET video_url = 'https://youtu.be/eJ-ITm3SuCw'
WHERE id = '31bdb483-8a69-440f-afd1-0d0721749532'
  AND lesson_title = 'The REAL Way to Learn Day Trading (1:1 Mentorship Call)'
  AND COALESCE(trim(video_url), '') = '';
