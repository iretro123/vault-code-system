-- Archive identity/provenance is immutable and must outlive feed retention.
-- New writes still require a genuine registered ready capture in the RPC.
-- An archive must neither block the existing feed-retention job nor cascade
-- away with that job. This migration deletes no records or images.
ALTER TABLE public.pulse_image_archive DROP CONSTRAINT pulse_image_archive_event_id_fkey;
