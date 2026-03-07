

## Route All User Messages to Admin/Operator Inbox

### The 4 Dead Ends Found

| # | Source | Where reply lands | Admin notified? |
|---|--------|-------------------|-----------------|
| 1 | **DM reply** — user replies to composed message or auto-DM | `dm_messages` table | No — admin must manually check Admin Panel → DMs tab |
| 2 | **Coach ticket reply** — user replies in Ask Coach thread | `coach_ticket_replies` with `is_admin=false` | No — existing trigger only fires when `is_admin=true` |
| 3 | **New coach ticket** — user submits a new Ask Coach question | `coach_tickets` table | No — no trigger exists |
| 4 | **Auto-DM reply** — user replies to the welcome DM | Same as #1 (`dm_messages`) | No — same dead end |

All four are solved with **3 database triggers** (no frontend changes needed). The existing inbox UI + sender identity system will automatically display these notifications with the member's avatar and name.

### Solution — 3 SECURITY DEFINER Triggers

All triggers insert into `inbox_items` targeting every user with the `operator` app_role, with `sender_id` set to the member who sent the message. This means notifications appear in the admin/coach/operator inbox (bottom-left bell icon) automatically.

**Trigger 1: `notify_operators_on_dm_message()`** — Solves dead ends #1 and #4
- Fires `AFTER INSERT ON dm_messages`
- Skips if sender IS an operator (no self-notifications)
- Looks up sender's display_name from `profiles`
- Inserts one `inbox_items` row per operator: type `"coach_reply"`, title `"{Name} sent a message"`, link `/academy/admin/panel?tab=dms`, `sender_id = NEW.sender_id`

**Trigger 2: Update `inbox_on_coach_reply()`** — Solves dead end #2
- Currently only fires when `is_admin = true` (coach → user)
- Add an `ELSE` branch: when `is_admin = false` (user → coach), insert one `inbox_items` row per operator with type `"coach_reply"`, title `"{Name} replied to a question"`, link `/academy/admin/panel`

**Trigger 3: `notify_operators_on_new_ticket()`** — Solves dead end #3
- Fires `AFTER INSERT ON coach_tickets`
- Looks up submitter's display_name from `profiles`
- Inserts one `inbox_items` row per operator: type `"coach_reply"`, title `"{Name} asked a question"`, link `/academy/admin/panel`

### Why Triggers (Not Client Code)

- Catches ALL inserts regardless of which UI sent them
- Auto-DM replies go through the same `dm_messages` table, so trigger #1 covers them automatically
- `SECURITY DEFINER` bypasses RLS to read `user_roles` and insert inbox items for other users
- Zero frontend changes needed — existing inbox renders these with sender avatar + role badge

### RLS Note

The `inbox_items` SELECT policy currently only allows `user_id = auth.uid() OR user_id IS NULL`. The trigger inserts rows with `user_id` set to each operator's ID, so operators will see them in their personal inbox. This is correct.

### Files

| What | Where |
|------|-------|
| 3 trigger functions + 2 new triggers + 1 updated trigger | Single DB migration |

No frontend code changes required.

