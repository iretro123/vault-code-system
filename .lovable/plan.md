

## Fix: Collapse All DM Notifications Into One Card Per Conversation

### Root Cause Analysis

The UPSERT trigger migration was created but there are two remaining issues:

1. **Existing duplicate inbox items** — Old spam cards from before the UPSERT fix are still in the database, cluttering the admin inbox.

2. **`inbox_on_coach_reply` trigger still uses plain INSERT** — When users reply to coach tickets, it still creates a new inbox card every time (no UPSERT logic). This trigger in the same migration file was never updated.

3. **User inbox also needs UPSERT** — When admin sends a DM reply, if a trigger creates a notification for the user, those could also stack up. Need to verify and apply UPSERT consistently.

### Solution

**A. Update `inbox_on_coach_reply` with UPSERT logic** (DB migration)
- Same pattern as `notify_operators_on_dm_message`: check for existing unread `coach_reply` from same sender before inserting
- Also update `notify_operators_on_new_ticket` with same UPSERT pattern

**B. Deduplicate existing inbox items** (DB data operation)
- Delete old duplicate `coach_reply` inbox items, keeping only the most recent per sender per user

**C. Add sender_name/sender_role columns to inbox_items** (if missing)
- The `InboxDrawer` references `item.sender_name` and `item.sender_role` but these may not be stored, causing the RZ name and CEO badge to not display

### Changes

| Target | What |
|--------|------|
| DB migration | Update `inbox_on_coach_reply` + `notify_operators_on_new_ticket` with UPSERT logic; add `sender_name`/`sender_role` columns to `inbox_items` if needed |
| DB data cleanup | Delete duplicate inbox items, keep latest per sender |
| No frontend changes needed | Trigger fixes handle everything server-side |

