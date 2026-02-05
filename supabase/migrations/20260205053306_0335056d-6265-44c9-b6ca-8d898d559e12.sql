-- Create pre_trade_checks table for storing check history
CREATE TABLE public.pre_trade_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  discipline_score INTEGER NOT NULL,
  can_trade BOOLEAN NOT NULL,
  planned_risk NUMERIC NOT NULL,
  max_risk_allowed NUMERIC NOT NULL,
  trades_remaining INTEGER NOT NULL,
  daily_loss_remaining NUMERIC NOT NULL,
  is_cleared BOOLEAN NOT NULL,
  violation_reason TEXT
);

-- Enable RLS
ALTER TABLE public.pre_trade_checks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own pre-trade checks"
  ON public.pre_trade_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pre-trade checks"
  ON public.pre_trade_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_trade_checks;