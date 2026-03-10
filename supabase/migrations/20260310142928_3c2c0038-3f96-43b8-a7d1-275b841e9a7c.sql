
-- 1. Drop the blocking trigger that prevents journal-style trade logging
DROP TRIGGER IF EXISTS enforce_trade_permission_trigger ON public.trade_entries;

-- 2. Drop restrictive check constraints
ALTER TABLE public.trade_entries DROP CONSTRAINT IF EXISTS trade_entries_risk_reward_check;
ALTER TABLE public.trade_entries DROP CONSTRAINT IF EXISTS trade_entries_risk_used_check;

-- 3. Re-add relaxed constraints: risk_used must be non-negative (no upper cap), risk_reward can be any value
ALTER TABLE public.trade_entries ADD CONSTRAINT trade_entries_risk_used_check CHECK (risk_used >= 0);
