
-- 1. Create a sequence for monotonic message ordering
CREATE SEQUENCE IF NOT EXISTS public.academy_messages_seq_seq START WITH 1;

-- 2. Add seq column with default from the sequence
ALTER TABLE public.academy_messages
  ADD COLUMN IF NOT EXISTS seq bigint DEFAULT nextval('public.academy_messages_seq_seq');

-- 3. Backfill existing rows ordered by created_at
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.academy_messages
)
UPDATE public.academy_messages m
SET seq = o.rn
FROM ordered o
WHERE m.id = o.id;

-- 4. Set sequence to continue after max backfilled value
SELECT setval('public.academy_messages_seq_seq', COALESCE((SELECT MAX(seq) FROM public.academy_messages), 0) + 1);

-- 5. Make seq NOT NULL after backfill
ALTER TABLE public.academy_messages ALTER COLUMN seq SET NOT NULL;

-- 6. Index for efficient unread queries
CREATE INDEX IF NOT EXISTS idx_academy_messages_room_seq ON public.academy_messages (room_slug, seq);
