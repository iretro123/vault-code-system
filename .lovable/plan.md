

## Luxury Weekly Schedule Drawer for /academy/live

### Current Behavior
"Full Schedule" button scrolls to a plain list at the bottom of the page. On mobile it's easy to miss and feels utilitarian.

### New Behavior
"Full Schedule" opens a premium bottom sheet / drawer with a horizontally scrollable day picker (Mon–Sun) showing the current week. Tapping a day highlights it and filters sessions for that day. Each session card shows time, title, type badge, duration, and a "Join" or "Add to Calendar" action. Empty days show a rest-day message.

### Design Language
- Bottom sheet drawer (Sheet component from ui/sheet) sliding up on mobile, side drawer on desktop
- Horizontal day strip at top: 7 pill-shaped day buttons with the day name + date number, active day gets primary blue ring + fill
- Today auto-selected and marked with a dot indicator
- Session cards use the vault-luxury-card style with radial gradient backgrounds
- Session type color-coded: blue dot for Live Trading, amber for Q&A, emerald for Market Prep
- Smooth fade-in animation on day switch
- No scroll-to-bottom behavior anymore — the button opens the sheet instead

### Implementation

**`src/components/academy/live/WeekScheduleSheet.tsx`** (new)
- Props: `open`, `onOpenChange`, `sessions: LiveSession[]`, `onJoin`, `onCalendar`
- Compute current week (Mon–Sun) dates
- State: `selectedDay` index (default = today's index in the week, or 0)
- Horizontal scrollable day strip with 7 buttons
- Filter sessions by selected day
- Render session cards or empty state per day
- Uses Sheet from ui/sheet with `side="bottom"` on mobile

**`src/pages/academy/AcademyLive.tsx`**
- Add `scheduleOpen` state
- Change both "Full Schedule" buttons' `onClick` from `scrollToSchedule` to `setScheduleOpen(true)`
- Remove the `scrollToSchedule` function
- Keep the `#live-full-schedule` section as-is for desktop full view (optional fallback), but the button now opens the sheet
- Import and render `<WeekScheduleSheet>`

### Files Changed
- `src/components/academy/live/WeekScheduleSheet.tsx` (new)
- `src/pages/academy/AcademyLive.tsx`

