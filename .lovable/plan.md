

# Smart Coaching Nudge — Navigate to Schedule 1:1 Page

## What We're Building

A one-time-per-trigger coaching nudge modal that appears after logging a trade when the system detects the user is struggling. Instead of linking to an external Calendly URL, the primary CTA navigates to the existing **Schedule 1:1** sidebar page (`/academy/support`) which already has the full booking experience.

## Trigger Conditions (any one fires the modal)

1. **3+ consecutive losses** — losing streak from trade entries
2. **Drawdown > 10%** — `totalPnl / startingBalance < -0.10`
3. **Compliance < 40%** with 5+ trades
4. **3+ emotional trades** (`emotional_state >= 3`) in the last 5 entries

## Cooldown & One-Time Logic

- `localStorage` key per trigger type: `va_coaching_nudge_{type}_{timestamp}`
- 7-day cooldown per trigger — won't refire for same trigger within a week
- Different triggers are independent

## Files

### New: `src/hooks/useCoachingNudge.ts`
- Takes `entries`, `totalPnl`, `startingBalance`, `complianceRate` from existing hooks
- Checks all 4 trigger conditions
- Returns `{ shouldShow, triggerType, dismiss }`
- `dismiss()` writes cooldown timestamp to localStorage

### New: `src/components/academy/CoachingNudgeModal.tsx`
- Dialog with contextual headline per trigger:
  - Streak → "Rough stretch. Let's fix this together."
  - Drawdown → "Your account needs attention."
  - Compliance → "Rules keep breaking. Let's talk about why."
  - Emotional → "Trading on tilt? A fresh perspective helps."
- Supportive body copy (1-2 lines, not salesy)
- **Primary CTA**: "Schedule Your 1:1" → `navigate("/academy/support")` + closes modal
- **Secondary**: "Not now" → dismiss with cooldown
- Dark premium styling matching the app's design system

### Edit: `src/pages/academy/AcademyTrade.tsx`
- Import and use `useCoachingNudge` with existing trade data
- After successful `addEntry` (line ~360), set a flag
- Show `CoachingNudgeModal` with 1.5s delay after trade log success
- Wire dismiss to cooldown

## UX Flow

1. User logs a trade → success toast fires
2. 1.5s later, if trigger conditions met and not on cooldown → modal slides in
3. User taps "Schedule Your 1:1" → navigated to `/academy/support` (the existing sidebar page with Calendly embed)
4. Or taps "Not now" → modal closes, 7-day cooldown for that trigger

