
-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to hard-delete soft-deleted messages older than 15 minutes
CREATE OR REPLACE FUNCTION public.cleanup_deleted_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.academy_messages
  WHERE is_deleted = true
    AND deleted_at < (now() - interval '15 minutes');
END;
$$;

-- Schedule the cleanup to run every 5 minutes
SELECT cron.schedule(
  'cleanup-deleted-messages',
  '*/5 * * * *',
  'SELECT public.cleanup_deleted_messages()'
);
