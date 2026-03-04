

## Add "Daily Setups" Tab to Community

### Current State
The Community page has 3 tabs: Trade Floor, Announcements, Wins & Proof. Each tab either uses `RoomChat` (Trade Floor) or a custom component (Announcements = read-only cards, Wins = masonry grid with reactions).

### Plan

**1. Add the "Daily Setups" tab to `AcademyCommunity.tsx`**
- Add `"daily-setups"` to the TABS array (order: Trade Floor, Announcements, Daily Setups, Wins & Proof)
- Create a new `CommunityDailySetups` component and mount it in the tab content area (CSS-toggled like the others)

**2. Create `CommunityDailySetups.tsx`**
- Read-only feed (same pattern as `CommunityAnnouncements`) — members cannot post here
- Fetches messages from `academy_messages` where `room_slug = "daily-setups"`
- Displays setup cards with structured fields (Ticker, Bias, Key Levels, Notes) in a clean card layout
- Supports image attachments (chart screenshots) displayed inline
- Empty state: "No daily setups posted yet. Coaches will share daily market setups here."

**3. Update `RoomChat` usage for permissions**
- Trade Floor: `canPost = true` (members can send messages + images)
- Announcements: stays read-only (no composer)
- Daily Setups: read-only (no composer — only admins post via admin tools)
- Wins & Proof: `canPost = true` (members can post wins + screenshots)

**4. Ensure Wins & Proof has its own composer**
- Currently Wins & Proof uses `CommunityWins` which is a display-only grid with no message input
- Add a `RoomChat` instance for `wins-proof` room so members can type messages and upload images (png, jpg, all formats)

**5. Add `"daily-setups"` room slug to `academyChannels.ts`**
- Register the new channel so the system recognizes it

### Files
- **Edit** `src/pages/academy/AcademyCommunity.tsx` — add Daily Setups tab + mount components
- **Create** `src/components/academy/community/CommunityDailySetups.tsx` — read-only setup feed
- **Edit** `src/components/academy/community/CommunityWins.tsx` — add RoomChat composer for member posting
- **Edit** `src/lib/academyChannels.ts` — add daily-setups channel

