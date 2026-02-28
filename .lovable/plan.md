

## Append "(EST)" to live session time displays

Three locations in `AcademyLive.tsx` use `formatTime()` to show session times. Append ` EST` after each one. Also append `EST` in the `LiveCallsCard.tsx` dashboard card.

### Changes

**`src/pages/academy/AcademyLive.tsx`** — 3 edits:

1. **Line 438** (hero next session): `{formatTime(nextSession.session_date)}` → `{formatTime(nextSession.session_date)} EST`
2. **Line 497** (this week list): `{formatTime(s.session_date)}` → `{formatTime(s.session_date)} EST`
3. **Line 570** (calendar day row): `{formatTime(d)}` → `{formatTime(d)} EST`

**`src/components/academy/dashboard/LiveCallsCard.tsx`** — 1 edit:

4. **Line 79** (session time in dashboard card): append ` EST` after the time display in the `toLocaleDateString` output. Change the options to include the time format consistently, or simply append ` EST` after the closing `)}`.

These are purely display-label additions. No logic changes, no timezone conversion, no database changes.

