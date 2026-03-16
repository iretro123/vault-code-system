

# Fix: Coach Tickets — Show Sender Name + Fix Inbox Link

## Problem Found
Kenya's message **is in the database** (coach_tickets table, status: open). Your operator role has full read access. Two UX issues are hiding it:

1. **No sender name on tickets** — The admin ticket list shows category, urgency, date, and question text, but never shows WHO submitted it. You can't tell it's from Kenya without reading the full content.
2. **Wrong inbox link** — When Kenya submits a question, the inbox notification links to `/academy/admin/panel` instead of `/academy/admin` where the actual ticket list lives.

## Changes

### 1. `src/pages/academy/AcademyAdmin.tsx` — Show submitter name on each ticket

- Join `profiles` table when fetching tickets to get `display_name` and `email`
- Update the Ticket interface to include `user_display_name` and `user_email`
- Render the sender name prominently on each ticket card (e.g., "From: Kenya" above the question text)

### 2. `src/components/academy/CoachDrawer.tsx` — Fix inbox notification link

- When a user submits a coach ticket, the code creates an inbox item for the admin with `link: "/academy/admin/panel"`. Change this to `link: "/academy/admin"` so clicking the notification takes you directly to the ticket list.

## Result
Each support ticket will clearly show who submitted it, and clicking the inbox notification will navigate directly to the ticket list where you can read and reply.

