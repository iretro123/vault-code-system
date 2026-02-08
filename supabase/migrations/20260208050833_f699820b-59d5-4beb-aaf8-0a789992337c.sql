
-- 1. Add onboarding fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_trading_style text NOT NULL DEFAULT 'intraday',
ADD COLUMN IF NOT EXISTS market_type text NOT NULL DEFAULT 'options',
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. Add behavior tracking to vault_state
ALTER TABLE public.vault_state
ADD COLUMN IF NOT EXISTS current_session_behavior text NOT NULL DEFAULT 'intraday',
ADD COLUMN IF NOT EXISTS last_block_reason text;

-- 3. Behavior detection function
CREATE OR REPLACE FUNCTION public.detect_session_behavior(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _avg_duration_minutes numeric;
  _trade_count int;
  _behavior text;
  _default_style text;
BEGIN
  SELECT COALESCE(default_trading_style, 'intraday') INTO _default_style
  FROM profiles WHERE user_id = _user_id;

  SELECT COUNT(*) INTO _trade_count
  FROM trade_intents
  WHERE user_id = _user_id
    AND created_at::date = CURRENT_DATE
    AND status IN ('approved', 'closed');

  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 60), 0)
  INTO _avg_duration_minutes
  FROM trade_intents
  WHERE user_id = _user_id
    AND created_at::date = CURRENT_DATE
    AND closed_at IS NOT NULL;

  _behavior := _default_style;

  IF _trade_count >= 3 THEN
    _behavior := 'intraday';
  ELSIF _avg_duration_minutes > 0 AND _avg_duration_minutes < 30 THEN
    _behavior := 'intraday';
  ELSIF _avg_duration_minutes >= 30 AND _trade_count <= 2 THEN
    _behavior := 'multi_day';
  END IF;

  UPDATE vault_state
  SET current_session_behavior = _behavior, updated_at = now()
  WHERE user_id = _user_id AND date = CURRENT_DATE;

  RETURN _behavior;
END;
$$;

-- 4. Micro feedback function
CREATE OR REPLACE FUNCTION public.get_micro_feedback(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_trades int;
  _total_days int;
  _avg_trades_per_day numeric;
  _risk_mode text;
  _restrictions int;
BEGIN
  SELECT COUNT(*) INTO _total_trades
  FROM trade_intents
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE - interval '7 days'
    AND status = 'closed';

  IF _total_trades < 3 THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(DISTINCT created_at::date) INTO _total_days
  FROM trade_intents
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE - interval '7 days'
    AND status = 'closed';

  IF _total_days > 0 THEN
    _avg_trades_per_day := _total_trades::numeric / _total_days;
  END IF;

  SELECT risk_mode INTO _risk_mode
  FROM vault_state
  WHERE user_id = _user_id AND date = CURRENT_DATE;

  IF _risk_mode = 'AGGRESSIVE' THEN
    SELECT COUNT(*) INTO _restrictions
    FROM trade_intents
    WHERE user_id = _user_id
      AND created_at >= CURRENT_DATE - interval '7 days'
      AND status = 'blocked';

    IF _restrictions > 2 THEN
      RETURN 'Aggressive mode increases restriction speed.';
    END IF;
  END IF;

  IF _avg_trades_per_day IS NOT NULL AND _avg_trades_per_day <= 2.5 THEN
    RETURN 'You perform best when trading ≤ 2 times.';
  END IF;

  IF _avg_trades_per_day IS NOT NULL AND _avg_trades_per_day > 2.5 THEN
    RETURN 'Losses increase after your third trade.';
  END IF;

  RETURN NULL;
END;
$$;

-- 5. Onboarding completion function
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _user_id uuid,
  _balance numeric,
  _market_type text,
  _default_style text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET
    default_trading_style = _default_style,
    market_type = _market_type,
    onboarding_completed = true,
    updated_at = now()
  WHERE user_id = _user_id;

  PERFORM set_account_balance(_user_id, _balance);

  RETURN true;
END;
$$;

-- 6. Update close_trade_intent to also detect behavior and store block reason
-- We wrap behavior detection into a trigger that fires after trade_intents updates
CREATE OR REPLACE FUNCTION public.auto_detect_behavior()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.closed_at IS NOT NULL AND (OLD.closed_at IS NULL OR OLD.closed_at IS DISTINCT FROM NEW.closed_at) THEN
    PERFORM detect_session_behavior(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_detect_behavior ON public.trade_intents;
CREATE TRIGGER trg_auto_detect_behavior
AFTER UPDATE ON public.trade_intents
FOR EACH ROW
EXECUTE FUNCTION public.auto_detect_behavior();

-- 7. Store last block reason: trigger on trade_intents insert when blocked
CREATE OR REPLACE FUNCTION public.store_last_block_reason()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'blocked' AND NEW.block_reason IS NOT NULL THEN
    UPDATE vault_state
    SET last_block_reason = NEW.block_reason, updated_at = now()
    WHERE user_id = NEW.user_id AND date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_block_reason ON public.trade_intents;
CREATE TRIGGER trg_store_block_reason
AFTER INSERT ON public.trade_intents
FOR EACH ROW
EXECUTE FUNCTION public.store_last_block_reason();
