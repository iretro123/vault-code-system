create or replace function public.get_vault_focus_status(_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  v_remaining_seconds int;
begin
  select * into s
  from public.vault_focus_sessions
  where user_id = _user_id and status = 'ACTIVE'
  order by created_at desc
  limit 1;

  if s is null then
    return jsonb_build_object('active', false);
  end if;

  v_remaining_seconds := greatest(0, floor(extract(epoch from (s.ends_at - now())))::int);

  return jsonb_build_object(
    'active', true,
    'session_id', s.id,
    'ends_at', s.ends_at,
    'remaining_seconds', v_remaining_seconds,
    'max_trades', s.max_trades,
    'trades_taken', s.trades_taken,
    'trades_remaining', greatest(0, s.max_trades - s.trades_taken),
    'cooldown_after_loss_minutes', s.cooldown_after_loss_minutes,
    'goals', s.goals
  );
end;
$$;

revoke all on function public.get_vault_focus_status(uuid) from public;
grant execute on function public.get_vault_focus_status(uuid) to authenticated;