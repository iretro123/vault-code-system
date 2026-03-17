

# Simplify the Trade OS Flow — Love-It-Simple Edition

## Current Problems
1. **Plan stage** has "Use This Plan" button that saves the plan, then user must manually navigate to Live and figure out session times separately
2. **Live stage** is cluttered: status bars, execution toggles, Today's Limits section, Session Setup card, cutoff banners — too much cognitive load
3. **Review stage** is dense with trade lists, plan history, and multiple CTAs
4. **No smooth handoff** between stages — user has to figure out what to do next at each step

## New Simplified Flow

```text
PLAN → "Use This Plan & Begin" → auto-switch to LIVE
LIVE → Shows plan summary (luxury card) + session time inputs + "Start Session" / "End Session" (red pill)
REVIEW → Simple question: "Did you follow your plan?" Yes/No + log result
INSIGHTS → AI grade + stats
```

## Changes

### 1. `src/components/vault-planner/VaultTradePlanner.tsx`
- Rename "Use This Plan" button to **"Use This Plan & Begin"**
- After saving, call a new `onPlanSavedAndBegin` callback (or reuse `onPlanSaved`) that signals the parent to auto-switch to the Live stage

### 2. `src/pages/academy/AcademyTrade.tsx` — Plan Stage
- When `onPlanSaved` fires, auto-call `setStage("live")` so user is taken directly to Live
- Keep the budget summary and planner as-is (they work)

### 3. `src/pages/academy/AcademyTrade.tsx` — Live Stage (major simplification)
**Remove:**
- Status bar (vault dot, trade counters, risk remaining)
- Execution toggle (Mark Executing / Close & Log Result)
- TodaysLimitsSection
- Cutoff/closed banners
- "Complete Review" button that appears during live

**Replace with:**
- **Luxury plan summary card** — shows ticker, direction, contracts, entry, max loss in a clean premium card with a subtle glow
- **Session time inputs** — `SessionSetupCard` shown directly with label "Set Your Trading Window"
- **"Start Session"** button (primary blue, shown when times not yet set)
- **"End Session & Review"** — red filled pill button (always visible once session is active), transitions to Review stage
- Clean and spacious layout with breathing room

### 4. `src/pages/academy/AcademyTrade.tsx` — Review Stage (major simplification)
**Remove:**
- Session summary stats bar
- Plans history list
- Recent trades list
- Multiple CTAs

**Replace with:**
- Simple headline: "Session Review"
- Core question card: **"Did you follow the plan you set?"** with two clear buttons: "Yes, I followed it" (emerald) / "No, I used a different approach" (amber)
- After answering, show the log trade sheet pre-filled from the plan
- "Complete Review" CTA to finish the day

### 5. `src/components/trade-os/OSControlRail.tsx`
- Update stage descriptions to match the simplified flow language

## Files Touched

| File | Change |
|------|--------|
| `src/pages/academy/AcademyTrade.tsx` | Auto-switch to Live on plan save; simplify Live & Review stages |
| `src/components/vault-planner/VaultTradePlanner.tsx` | Rename CTA to "Use This Plan & Begin" |
| `src/components/trade-os/OSControlRail.tsx` | Update stage descriptions to match new flow |

