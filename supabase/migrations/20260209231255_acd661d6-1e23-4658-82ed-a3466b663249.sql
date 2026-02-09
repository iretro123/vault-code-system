
-- Weekly reports
CREATE TABLE public.weekly_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  days_traded int NOT NULL DEFAULT 0,
  green_days int NOT NULL DEFAULT 0,
  yellow_days int NOT NULL DEFAULT 0,
  red_days int NOT NULL DEFAULT 0,
  trades_taken int NOT NULL DEFAULT 0,
  trades_blocked int NOT NULL DEFAULT 0,
  risk_used numeric NOT NULL DEFAULT 0,
  risk_saved numeric NOT NULL DEFAULT 0,
  avg_trades_per_day numeric NOT NULL DEFAULT 0,
  avg_risk_per_trade numeric NOT NULL DEFAULT 0,
  block_rate numeric NOT NULL DEFAULT 0,
  most_common_block_reason text,
  stability_score int NOT NULL DEFAULT 100,
  mode_fit text,
  insight_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

ALTER TABLE public.weekly_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly reports" ON public.weekly_report FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly reports" ON public.weekly_report FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly reports" ON public.weekly_report FOR UPDATE USING (auth.uid() = user_id);

-- Monthly reports
CREATE TABLE public.monthly_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  days_traded int NOT NULL DEFAULT 0,
  green_days int NOT NULL DEFAULT 0,
  yellow_days int NOT NULL DEFAULT 0,
  red_days int NOT NULL DEFAULT 0,
  trades_taken int NOT NULL DEFAULT 0,
  trades_blocked int NOT NULL DEFAULT 0,
  risk_used numeric NOT NULL DEFAULT 0,
  risk_saved numeric NOT NULL DEFAULT 0,
  avg_trades_per_day numeric NOT NULL DEFAULT 0,
  avg_risk_per_trade numeric NOT NULL DEFAULT 0,
  block_rate numeric NOT NULL DEFAULT 0,
  most_common_block_reason text,
  stability_score int NOT NULL DEFAULT 100,
  mode_fit text,
  insight_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

ALTER TABLE public.monthly_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly reports" ON public.monthly_report FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monthly reports" ON public.monthly_report FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own monthly reports" ON public.monthly_report FOR UPDATE USING (auth.uid() = user_id);
