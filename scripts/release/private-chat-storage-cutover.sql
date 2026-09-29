-- RELEASE GATE: reviewed signed-media web AND native readers must be delivered,
-- or owner explicitly accepts old binaries losing attachment previews.
-- Never run this implicitly as part of the general migration queue.
-- Existing object paths are retained; no attachments are moved or deleted.
UPDATE storage.buckets SET public=false WHERE id='academy-chat-files';
