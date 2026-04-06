
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Market events cache table
CREATE TABLE public.market_events (
  id text PRIMARY KEY,
  date date NOT NULL,
  time_et text,
  country text NOT NULL DEFAULT 'US',
  event_name text NOT NULL,
  impact text NOT NULL DEFAULT 'low',
  actual numeric,
  estimate numeric,
  prev numeric,
  unit text DEFAULT '',
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read market_events"
  ON public.market_events FOR SELECT TO authenticated
  USING (true);

-- Market earnings cache table
CREATE TABLE public.market_earnings (
  id text PRIMARY KEY,
  date date NOT NULL,
  symbol text NOT NULL,
  hour text DEFAULT 'TBD',
  eps_estimate numeric,
  eps_actual numeric,
  revenue_estimate numeric,
  revenue_actual numeric,
  quarter integer,
  year integer,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read market_earnings"
  ON public.market_earnings FOR SELECT TO authenticated
  USING (true);

-- Indexes for date-range queries
CREATE INDEX idx_market_events_date ON public.market_events (date);
CREATE INDEX idx_market_earnings_date ON public.market_earnings (date);
