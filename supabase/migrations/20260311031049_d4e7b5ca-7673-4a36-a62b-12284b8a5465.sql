
-- New table: approved_plans
create table public.approved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ticker text,
  direction text not null default 'calls',
  entry_price_planned numeric not null,
  contracts_planned integer not null,
  stop_price_planned numeric,
  max_loss_planned numeric not null,
  cash_needed_planned numeric not null,
  tp1_planned numeric,
  tp2_planned numeric,
  approval_status text not null default 'fits',
  account_balance_snapshot numeric not null,
  trade_loss_limit_snapshot numeric not null,
  daily_left_snapshot numeric,
  account_level_snapshot text,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.approved_plans enable row level security;

create policy "Users manage own plans"
  on public.approved_plans for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add plan_id to trade_entries
alter table public.trade_entries
  add column plan_id uuid references public.approved_plans(id);
