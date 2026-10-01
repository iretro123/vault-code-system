BEGIN;
DO $$
DECLARE token text:=repeat('c',64); ticket uuid:=gen_random_uuid(); stamp bigint:=(extract(epoch from now())*1000)::bigint; old_id uuid; result boolean;
BEGIN
 UPDATE pulse_spy_config SET worker_hash=encode(sha256(convert_to(token,'UTF8')),'hex'),capture_lease=ticket,capture_lease_until=now()+interval '60 seconds' WHERE id;
 UPDATE pulse_market_liquidity_state SET lease=ticket WHERE symbol='NASDAQ:QQQ' AND timeframe=5;
 SELECT image_id INTO old_id FROM pulse_market_liquidity_state WHERE symbol='AMEX:SPY' AND timeframe=5;
 BEGIN
  PERFORM pulse_market_liquidity_finish(token,ticket,5,jsonb_build_object('ok',true,'symbol','AMEX:SPY','timeframe',5,'capturedAt',stamp,'quoteAt',stamp,'imageId',gen_random_uuid()),'NASDAQ:QQQ');
  RAISE EXCEPTION 'Wrong symbol accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'Invalid liquidity provenance' THEN RAISE; END IF;
 END;
 result:=pulse_market_liquidity_finish(token,ticket,5,jsonb_build_object('ok',true,'symbol','NASDAQ:QQQ','timeframe',5,'capturedAt',stamp,'quoteAt',stamp,'imageId',gen_random_uuid(),'above',745,'below',740),'NASDAQ:QQQ');
 IF NOT result THEN RAISE EXCEPTION 'Matching capture rejected'; END IF;
 IF (SELECT image_id FROM pulse_market_liquidity_state WHERE symbol='AMEX:SPY' AND timeframe=5) IS DISTINCT FROM old_id THEN RAISE EXCEPTION 'QQQ overwrote SPY'; END IF;
 IF (SELECT above FROM pulse_market_liquidity_state WHERE symbol='NASDAQ:QQQ' AND timeframe=5)<>745 THEN RAISE EXCEPTION 'QQQ did not persist'; END IF;
END $$;
ROLLBACK;
SELECT true AS symbol_isolation_passed;
