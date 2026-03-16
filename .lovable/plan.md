

# Fix: Remove Duplicate Trigger + Ensure All Future Tickets Work

## Problem
Two triggers fire on every new `coach_tickets` insert:

1. **`trg_notify_operators_new_ticket`** (old) — creates inbox items with wrong link `/academy/admin/panel`, no `dm_thread_id`, no DM message bridge. Uses `user_roles` table.
2. **`trg_inbox_new_coach_ticket`** (new) — correctly bridges into DMs, sets `dm_thread_id`, links to `/academy/admin`. Uses `academy_user_roles` + permissions.

Result: every new ticket creates **two** inbox notifications — one broken, one working. The old trigger is also what created Kenya's original broken notification.

## Fix (single migration)

1. **Drop the old trigger** `trg_notify_operators_new_ticket` from `coach_tickets`
2. **Drop the old function** `notify_operators_on_new_ticket()` (no longer needed)
3. **Fix Kenya's existing inbox item** — update the link from `/academy/admin/panel` to `/academy/admin` (data update via insert tool)

## Result
- One trigger per coach ticket submission — the correct one that bridges into DMs
- No more duplicate notifications
- All future "Ask Coach" submissions from any user will appear in your inbox with the correct DM thread link
- Replies you send will notify the student and appear in their DM thread

