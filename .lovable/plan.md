

# Bridge Coach Tickets into DM Conversations

## Root Cause

Two completely separate messaging systems exist:

1. **Coach Tickets** (`coach_tickets` + `coach_ticket_replies`) — used by "Ask RZ (Manual)" in CoachDrawer
2. **DMs** (`dm_threads` + `dm_messages`) — used by InboxDrawer's `InlineThreadView`

When Kenya submits a ticket, the trigger `inbox_on_new_coach_ticket` creates an `inbox_items` row for you. When you click that inbox notification, `InlineThreadView` opens — but it reads from `dm_messages`, which has nothing because the question went into `coach_tickets`. Empty thread.

Similarly, when you reply via the admin panel at `/academy/admin`, the trigger `inbox_on_coach_reply` notifies the student with a link to `/academy/my-questions` — but the inbox tries to open a DM thread, not the ticket detail.

## Fix: Database Trigger Updates

### 1. Update `inbox_on_new_coach_ticket()` trigger

When a student submits a coach ticket:
- Find or create a `dm_threads` row for that student
- Insert their question as a `dm_messages` row (sender = the student)
- Set `dm_thread_id` on the inbox notification so `InlineThreadView` resolves instantly

### 2. Update `inbox_on_coach_reply()` trigger

When admin replies to a ticket:
- Find or create a `dm_threads` row for the ticket's student
- Insert the reply as a `dm_messages` row (sender = admin)
- Set `dm_thread_id` on the inbox notification
- Update `dm_threads.last_message_at`

## Result

- Student submits "Ask RZ" → question appears as a DM message in their thread → you see it in your inbox and can read + reply inline
- You reply → reply appears as a DM message → student gets inbox notification and sees it in their DM thread
- Full back-and-forth works through the existing DM UI without any frontend changes

## No UI Code Changes Needed

The `InlineThreadView` component already handles:
- Resolving threads via `dm_thread_id`
- Rendering messages from `dm_messages`
- Sending replies via `sendDmMessage`
- Real-time updates via Supabase channel subscriptions

