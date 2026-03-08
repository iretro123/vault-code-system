create table public.live_session_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_title text not null default '',
  session_id text null,
  clicked_at timestamptz not null default now()
);
alter table public.live_session_attendance enable row level security;
create policy "Users can insert own attendance" on public.live_session_attendance for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can read own attendance" on public.live_session_attendance for select to authenticated using (auth.uid() = user_id);