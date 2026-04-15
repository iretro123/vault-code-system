

## Fix: Replace /rules Route with /academy/trade

### The Problem
The Daily Check-In modal's first prompt ("Have you set your trading rules?") links to `/rules`, which is a 404. Users clicking "Set Rules" hit a dead page.

### The Fix

**File: `src/components/academy/DailyCheckInModal.tsx`** (around line 296)

Change `ctaAction: "/rules"` to `ctaAction: "/academy/trade"` — this sends users to Trade OS where they can set up their rules.

Also update the copy to match:
- `cta: "Set Rules"` → `cta: "Open Trade OS"`
- `yesLabel: "Set Rules"` → `yesLabel: "Open Trade OS"`

One file, three string changes.

