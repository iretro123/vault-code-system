-- Create vault_focus_sessions table
create table if not exists public.vault_focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  duration_minutes int not null,
  status text not null default 'ACTIVE',
  max_trades int not null default 6,
  trades_taken int not null default 0,
  cooldown_after_loss_minutes int not null default 10,
  goals text
);

-- Create index for active sessions lookup
create index if not exists vault_focus_sessions_user_active_idx
  on public.vault_focus_sessions(user_id, created_at desc)
  where status = 'ACTIVE';

-- Enable RLS
alter table public.vault_focus_sessions enable row level security;

-- RLS policies
create policy "focus_sessions_read_own"
on public.vault_focus_sessions for select
using (auth.uid() = user_id);

create policy "focus_sessions_write_own"
on public.vault_focus_sessions for insert
with check (auth.uid() = user_id);

create policy "focus_sessions_update_own"
on public.vault_focus_sessions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Validation trigger for status
create or replace function public.validate_focus_session_status()
returns trigger
language plpgsql
as $$
begin
  if NEW.status not in ('ACTIVE', 'ENDED') then
    raise exception 'Invalid status: must be ACTIVE or ENDED';
  end if;
  return NEW;
end;
$$;

create trigger validate_focus_session_status_trigger
before insert or update on public.vault_focus_sessions
for each row execute function public.validate_focus_session_status();