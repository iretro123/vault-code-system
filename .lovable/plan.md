

## Plan: Remove kicked/banned users from the members list

### Problem
When you kick or ban a user, they stay in the list because the code uses `.map()` to update the row in place instead of removing it.

### Changes

**`src/components/admin/AdminMembersTab.tsx`**

1. **Line 164 (handleKick)**: Change `prev.map(...)` to `prev.filter(u => u.user_id !== userId)` so the user disappears immediately after being kicked.

2. **Line 185 (handleBan)**: Same change — use `prev.filter(u => u.user_id !== userId)` instead of mapping.

No backend changes needed. The profile update to `access_status: "revoked"` already works correctly — this is purely a UI state fix.

