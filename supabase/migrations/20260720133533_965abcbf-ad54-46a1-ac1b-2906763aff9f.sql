
UPDATE public.student_access sa
SET is_lifetime = true,
    status = 'active',
    updated_at = now()
FROM public.students s
WHERE sa.user_id = s.id
  AND lower(s.email) IN (
    'mc4162@gmail.com',
    'kenyarogers412@gmail.com',
    'brucefairfield64@hotmail.com'
  );
