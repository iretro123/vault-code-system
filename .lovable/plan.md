

# Remove Hardcoded Mock Data from Components

## Summary

Three components have fully hardcoded mock data and are **not imported or used anywhere** in the app. Two other components use mock data as sensible fallbacks. Here's the action plan:

## 1. Delete unused mock components (dead code)

These three files are never imported — they're dead weight with fake numbers:

- **`src/components/academy/TraderHUD.tsx`** — hardcoded vault score, streak, compliance
- **`src/components/academy/WeeklySnapshotCard.tsx`** — hardcoded trades, compliance, mistake text
- **`src/components/academy/WeeklyPerformanceCard.tsx`** — hardcoded weekly stats with a "wire later" comment

**Action:** Delete all three files. They serve no purpose and could confuse future development.

## 2. Fix GameplanCard fallback (minor)

**File:** `src/components/academy/dashboard/GameplanCard.tsx`

The "recent activity" list falls back to `MOCK_RECENT` (fake entries like "Claim your role — Mar 1") when the user has no completed tasks. Instead of showing fake history, show a friendly empty state message like "No activity yet — complete your first task to see it here."

**Action:** Replace `MOCK_RECENT` fallback with an inline empty-state message.

## 3. Keep AcademyLive mock mode (acceptable)

**File:** `src/pages/academy/AcademyLive.tsx`

The mock sessions are gated behind `?mockLive=1` query param and clearly labeled "Dev preview — showing mock data." This is an intentional dev/admin tool, not user-facing. **No change needed.**

## Files changed

| File | Action |
|------|--------|
| `src/components/academy/TraderHUD.tsx` | Delete |
| `src/components/academy/WeeklySnapshotCard.tsx` | Delete |
| `src/components/academy/WeeklyPerformanceCard.tsx` | Delete |
| `src/components/academy/dashboard/GameplanCard.tsx` | Replace mock fallback with empty state |

