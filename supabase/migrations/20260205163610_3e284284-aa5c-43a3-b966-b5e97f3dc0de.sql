-- Update or create the enforcement trigger function
-- If trade passes authority, stamp it as vault_verified
create or replace function public.enforce_trade_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_permission record;
begin
  -- Get the master authority decision
  select * into v_permission
  from public.get_vault_execution_permission(NEW.user_id)
  limit 1;

  -- If blocked, deny the insert
  if v_permission is null or not v_permission.execution_allowed then
    raise exception 'Trade blocked by Vault: %', coalesce(v_permission.block_reason, 'Not authorized');
  end if;

  -- If allowed, stamp as vault verified (anti-cheat)
  NEW.vault_verified := true;
  NEW.vault_verified_at := now();

  return NEW;
end;
$$;

-- Ensure trigger exists on trade_entries (drop first to avoid duplicates)
drop trigger if exists enforce_trade_permission_trigger on public.trade_entries;

create trigger enforce_trade_permission_trigger
before insert on public.trade_entries
for each row execute function public.enforce_trade_permission();