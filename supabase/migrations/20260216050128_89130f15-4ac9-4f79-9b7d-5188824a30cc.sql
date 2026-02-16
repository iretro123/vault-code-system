
-- Add attachments JSONB column to academy_messages
-- Each attachment: { type: "image"|"file", url: string, filename: string, size: number, mime: string }
ALTER TABLE public.academy_messages
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
