-- Cold symbol/timeframe initialization can exceed the former 28/34s transport
-- deadline. Keep exclusive ownership longer than all browser work + finish RPC.
-- Preserve every existing authorization, freshness, preference and queue check.
DO $migration$
DECLARE routine text; definition text; occurrences integer; expected integer;
BEGIN
  FOREACH routine IN ARRAY ARRAY['pulse_spy_capture_claim','pulse_spy_capture_probe_claim'] LOOP
    definition := pg_get_functiondef(to_regprocedure('public.'||routine||'(text)'));
    IF definition IS NULL THEN RAISE EXCEPTION 'Missing capture claim function: %',routine; END IF;
    expected := CASE WHEN routine='pulse_spy_capture_claim' THEN 2 ELSE 1 END;
    occurrences := (length(definition)-length(replace(definition,'''40 seconds''','')))/length('''40 seconds''');
    IF occurrences <> expected THEN RAISE EXCEPTION 'Unexpected capture lease definition: %',routine; END IF;
    EXECUTE replace(definition,'''40 seconds''','''60 seconds''');
  END LOOP;
END $migration$;
