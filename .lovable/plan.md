

## Show Sender Identity on All Inbox Messages

### Problem
The `inbox_items` table has no `sender_id` column. When admins compose messages, send auto-DMs, or create announcements, there's no record of who sent them. The inbox UI shows generic icons (bell/megaphone) with no name, avatar, or role badge.

### Solution

**1. Database migration — add `sender_id` to `inbox_items`**

- Add nullable `sender_id uuid` column to `inbox_items`
- Update the `send_welcome_inbox()` trigger function to not set `sender_id` (system-generated items stay NULL — we can show a "Vault Academy" fallback for those)

**2. Update all insert locations to include `sender_id: user.id`**

| File | Insert call |
|------|-------------|
| `AdminBroadcastTab.tsx` | Compose (motivation_ping + announcement, both single & broadcast) — 3 insert calls |
| `AdminAnnouncementsTab.tsx` | Announcement with notify — 1 insert call |
| `AcademyAdmin.tsx` | Quick announcement + motivation send — 2 insert calls |
| `AcademyResources.tsx` | New resource added notification — 1 insert call |

Each gets `sender_id: user.id` added to the insert object.

**3. Update `AcademyDataContext.tsx` — fetch sender profiles**

- Expand `InboxItem` interface to include `sender_id`, `sender_name`, `sender_avatar`, `sender_role`
- After fetching inbox items, collect unique `sender_id`s, batch-fetch profiles (display_name, avatar_url) and academy roles
- Attach sender info to each mapped item

**4. Update `InboxDrawer.tsx` — render sender identity**

- In `ItemList` (Inbox tab): show sender avatar (28px circle with initials fallback) + sender name + `AcademyRoleBadge` instead of generic type icon
- In `WhatsNewCard` (What's New tab): same treatment — avatar + name + badge
- For items without `sender_id` (system/auto-DM): show "Vault Academy" with a default icon
- Import and use the existing `AcademyRoleBadge` component

### Files changed

| What | Where |
|------|-------|
| Add `sender_id` column | DB migration |
| Include `sender_id` on inserts | `AdminBroadcastTab.tsx`, `AdminAnnouncementsTab.tsx`, `AcademyAdmin.tsx`, `AcademyResources.tsx` |
| Fetch sender profiles + expand InboxItem type | `AcademyDataContext.tsx` |
| Render avatar, name, role badge | `InboxDrawer.tsx` |

