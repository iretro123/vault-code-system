

## Add Countdown / Live Duration Timer to Live Sessions Page

### What It Does

A real-time timer displayed on the next session hero card:
- **Before session starts**: Countdown showing `Xd Xh Xm Xs` until the session begins
- **During session**: Switches to a "LIVE" badge + elapsed timer showing `Xh Xm Xs` since it started
- **After session ends** (based on `duration_minutes`): Timer disappears, card reverts to normal state

### Implementation

**1. New component: `src/components/academy/live/SessionTimer.tsx`**

A self-contained component that takes `sessionDate` (ISO string) and `durationMinutes` (number), runs a 1-second `setInterval`, and renders:

- **Pre-session**: `⏳ Starts in 2d 5h 32m 14s` — white/60 text, monospace numbers
- **Live now**: Pulsing red dot + `LIVE · 00:14:32` — red accent, bold white
- **Ended**: Returns `null` (hides itself)

```tsx
<SessionTimer sessionDate={nextSession.session_date} durationMinutes={nextSession.duration_minutes} />
```

**2. File: `src/pages/academy/AcademyLive.tsx`**

Insert `<SessionTimer>` between the date line (line 455) and the action buttons (line 457). One line addition, no other changes.

### Design Details

- Countdown uses `font-mono` for stable digit widths (no layout jank)
- Live state: small pulsing red dot (`animate-pulse`) + "LIVE" badge
- Timer updates every second via `setInterval`, cleaned up on unmount
- Lightweight — no external dependencies

