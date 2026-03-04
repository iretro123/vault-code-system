

## Make Composer Visible in All Community Tabs with Role-Based Posting

### Current State
- **Trade Floor** and **Wins & Proof**: Use `RoomChat` with `canPost={true}` — everyone can type
- **Announcements**: Uses a custom `CommunityAnnouncements` component (no composer at all)
- **Daily Setups**: Uses a custom `CommunityDailySetups` component (no composer at all)

### Changes

**Edit `src/pages/academy/AcademyCommunity.tsx`**
- Import `useAcademyPermissions` to check if user is CEO, Admin, Coach, or operator
- Replace `CommunityAnnouncements` with `RoomChat` using `roomSlug="announcements"` and `canPost` set to true only for CEO/Admin/operator
- Replace `CommunityDailySetups` with `RoomChat` using `roomSlug="daily-setups"` and `canPost` set to true only for CEO/Admin/operator
- Trade Floor and Wins stay as-is (everyone can post)

This means all 4 tabs show the same chat interface with the composer bar. Members see the composer area but get a "read-only for students" message in Announcements and Daily Setups. Admins/CEO/operators see the full working composer in all tabs.

### Files
- **Edit** `src/pages/academy/AcademyCommunity.tsx` — swap components + add permission check

