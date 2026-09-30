-- Align feed session labels with regular US equity hours (DST-aware).
DO $change$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('pulse_feed','pulse_feed_spy')
 LOOP
  EXECUTE replace(pg_get_functiondef(f.oid),'''09:00''','''09:30''');
 END LOOP;
END $change$;
