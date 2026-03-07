
-- Step 1: Delete orphan threads where user_id belongs to an operator
DELETE FROM dm_threads
WHERE user_id IN (
  SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'operator'
);

-- Step 2: For any remaining duplicates per user_id, keep only the one with the latest last_message_at
DELETE FROM dm_threads
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM dm_threads
  ORDER BY user_id, last_message_at DESC
);

-- Step 3: Add unique constraint to enforce 1 thread per member
ALTER TABLE dm_threads ADD CONSTRAINT dm_threads_user_id_unique UNIQUE (user_id);
