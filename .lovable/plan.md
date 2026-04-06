

## Remove Announcements Tab from Community

### Change
Remove the "Announcements" tab from the Community page, leaving only **Chat → Signals → Wins**.

### File: `src/pages/academy/AcademyCommunity.tsx`
- Remove the `announcements` entry from the `TABS` array
- Remove the corresponding `RoomChat` render block for announcements
- No other files need changes — the announcements feed components stay in the codebase but are simply not rendered

