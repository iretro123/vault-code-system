

# Fix: Bridge Coach Tickets into DM Conversations

## Root Cause
Two separate messaging systems exist side-by-side:
- **DMs** (`dm_threads` + `dm_messages`) — the iMessage-style chat
- **Ask Coach** (`coach_tickets`) — the ticket submission form

When Kenya submits an "Ask Coach" question, it goes into `coach_tickets` only. The inbox notification links to the DM thread, but the actual question text was never inserted as a DM message. Result: you open the thread and see nothing new.

## Fix

### 1. Database trigger: auto-bridge coach tickets into DMs

Update the existing `inbox_on_new_coach_ticket()` trigger function to also:
- Find or create a `dm_threads` row for the submitting user
- Insert the ticket question as a `dm_messages` row in that thread (sender = the student)
- Link the inbox notification to that DM thread via `dm_thread_id`

This way, when Kenya submits a coach ticket, her question immediately appears as a DM message in her thread, and your inbox notification opens directly to it.

### 2. Update inbox notification to include `dm_thread_id`

The current trigger inserts into `inbox_items` without `dm_thread_id`. Adding it ensures `InlineThreadView` resolves the correct thread instantly instead of falling back to a lookup.

## Result
When any student submits an "Ask Coach" question:
1. Their question appears as a message in their DM thread
2. You get an inbox notification that opens directly to that conversation
3. You can read what they asked and reply inline — no more missing messages

## What stays the same
- The `coach_tickets` table still stores the ticket for the admin ticket list
- The existing DM system, realtime subscriptions, and read receipts all work as-is
- No UI code changes needed — the `InlineThreadView` already renders `dm_messages` correctly

