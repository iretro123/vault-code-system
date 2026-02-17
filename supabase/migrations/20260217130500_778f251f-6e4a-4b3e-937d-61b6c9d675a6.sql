
-- Add pinned column to inbox_items
ALTER TABLE public.inbox_items ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;
