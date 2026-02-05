create or replace function public.start_vault_focus_session(
  duration_minutes int,
  max_trades int default 6,
  cooldown_after_loss_minutes int default 10,
  goals text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  -- End any active sessions
  update public.vault_focus_sessions
     set status = 'ENDED'
   where user_id = v_user
     and status = 'ACTIVE';

  -- Create new session
  insert into public.vault_focus_sessions(
    user_id, ends_at, duration_minutes, max_trades, cooldown_after_loss_minutes, goals
  )
  values (
    v_user,
    now() + make_interval(mins => greatest(5, duration_minutes)),
    greatest(5, duration_minutes),
    greatest(1, max_trades),
    greatest(0, cooldown_after_loss_minutes),
    goals
  )
  returning id into v_id;

  -- Log event (using event_context column per schema)
  insert into public.vault_events(user_id, event_type, event_context)
  values (v_user, 'focus_session_started', jsonb_build_object(
    'duration_minutes', duration_minutes,
    'max_trades', max_trades,
    'cooldown_after_loss_minutes', cooldown_after_loss_minutes
  ));

  return v_id;
end;
$$;

revoke all on function public.start_vault_focus_session(int,int,int,text) from public;
grant execute on function public.start_vault_focus_session(int,int,int,text) to authenticated;