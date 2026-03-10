

## Discord-Style Unread Badges — Community Tabs + Sidebar

### What We're Building
Red notification badges (like Discord) that show unread message counts on:
1. Each tab inside the Community page (Chat, Announcements, Signals, Wins)
2. The "Community" item in the sidebar nav

When a user clicks a tab, it marks that room as read, clears the badge, and the cycle repeats as new messages arrive via realtime.

### New File: `src/hooks/useUnreadCounts.ts`
- Accepts `activeRoomSlug` (the currently viewed room) and the user ID
- Tracks 4 room slugs: `trade-floor`, `announcements`, `daily-setups`, `wins-proof`
- Stores last-read timestamp per room in `localStorage` (`unread_ts_{slug}_{userId}`)
- On mount: queries `academy_messages` for count of unread messages per room (created_at > last-read, user_id != current user, is_deleted = false)
- Subscribes to Supabase Realtime INSERT on `academy_messages` — increments count for messages from other users when that room isn't active
- `markRead(slug)` — sets localStorage timestamp to now, resets that room's count to 0
- Returns `{ counts: Record<string, number>, totalUnread: number, markRead }`
- Display caps at "10+"

### Modified: `src/pages/academy/AcademyCommunity.tsx`
- Import `useUnreadCounts`, pass `activeTab`'s mapped room slug
- On tab change, call `markRead(roomSlug)` for the newly active tab
- Render red pill badge next to each tab label when count > 0
- Badge style: `bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center`

### Modified: `src/components/layout/AcademySidebar.tsx`
- Import `useUnreadCounts` at the component level
- On the Community nav item (line 51), render the `totalUnread` badge after the label
- When collapsed, position badge absolute on the icon
- Badge style: red pill with `ring-2 ring-[#0B0F14]` for clean cutout on dark bg

### Tab-to-Room Slug Mapping
```text
"trade-floor"   → "trade-floor"
"announcements" → "announcements"  
"daily-setups"  → "daily-setups"
"wins"          → "wins-proof"
```

