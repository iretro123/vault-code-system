

# AI Mentor Analysis — Full Pipeline Sync + Premium UI Overhaul

## Current State
The `trade-focus` edge function only reads `trade_entries` (last 20 trades). It ignores journal entries, daily check-ins, approved plans, and vault state. The UI card is functional but basic — no auto-refresh after trade changes, no reactivity to deletions, and the cache is date-based (stale for the whole day).

## Plan

### 1. Edge Function: Feed the AI Real Data from All Pipelines
**File: `supabase/functions/trade-focus/index.ts`**

Expand data fetching to pull from 4 additional tables alongside `trade_entries`:

- **`journal_entries`** (last 10): `what_happened`, `biggest_mistake`, `lesson`, `followed_rules`, `ticker` — gives the AI journal reflections and self-identified mistakes
- **`vault_daily_checklist`** (last 7 days): `mental_state`, `emotional_control`, `sleep_quality`, `plan_reviewed`, `risk_confirmed` — gives the AI readiness/wellness data
- **`approved_plans`** (last 10): `ticker`, `direction`, `contracts_planned`, `max_loss_planned`, `status`, `approval_status` — shows plan discipline (planned vs actually traded, cancelled plans)
- **`vault_state`** (today): `vault_status`, `loss_streak`, `risk_remaining_today`, `trades_remaining_today`, `risk_mode` — gives current session state

Build a richer system prompt that includes:
- Trade log summary (existing)
- Journal reflection summary (new)
- Check-in wellness trend (new)
- Plan execution rate: how many plans were made vs logged vs cancelled (new)
- Current vault status and streak (new)

Add two new output fields to the tool call:
- `disciplineScore`: "strong" | "moderate" | "weak" — based on rules compliance + plan follow-through
- `riskAssessment`: 1-sentence assessment of their current risk behavior

### 2. Frontend: Auto-Refresh After Trade Changes
**File: `src/pages/academy/AcademyTrade.tsx`**

- Pass `entries.length` as a dependency to `AIFocusCard` and invalidate cache when it changes (trade added or deleted triggers re-analysis)
- Remove the date-only cache key; use `${todayStr}_${entries.length}` so any trade change busts the cache
- After a trade delete completes, the entries array updates → AIFocusCard detects the length change → auto-fetches fresh analysis

### 3. UI Overhaul — Luxury Futuristic Card
**File: `src/pages/academy/AcademyTrade.tsx` (AIFocusCard component)**

Redesign the card with premium iOS-style glassmorphism:

- **Header**: Glowing brain icon with animated pulse ring, "AI MENTOR" title with a shimmer gradient, live status indicator dot
- **Sections**: Each insight gets its own frosted-glass sub-card with:
  - Left accent bar color-coded by type (amber for mistakes, emerald for directives, cyan for sizing, violet for tips)
  - Icon with glow effect matching the accent color
  - Label in micro-mono uppercase with matching color
  - Content text in clean white
- **New sections**: Add "DISCIPLINE SCORE" (strong/moderate/weak badge with color) and "RISK ASSESSMENT" row
- **Encouragement footer**: Subtle gradient divider, italic text with lightning bolt icon and glow
- **Refresh button**: Animated refresh icon with "Re-scan" label, subtle hover glow
- **Animations**: 
  - Slow rotating conic gradient border (existing, refined)
  - Scan-line overlay at very low opacity
  - Fade-in transitions for each section row (staggered 100ms)

### 4. Summary of Data Flow After Changes

```text
Trade Logged/Deleted
  → entries[] updates (useTradeLog)
  → AIFocusCard detects length change
  → Busts localStorage cache
  → Calls trade-focus edge function
  → Edge function reads:
      trade_entries (last 20)
      journal_entries (last 10)
      vault_daily_checklist (last 7d)
      approved_plans (last 10)
      vault_state (today)
  → AI analyzes ALL behavioral data
  → Returns structured feedback
  → Card renders with premium UI
```

### Technical Details

- Edge function uses service-role client to query all tables (already does for trade_entries)
- Plan execution rate = `approved_plans WHERE status='logged'` / total plans × 100
- Journal compliance = % of journal entries where `followed_rules = true`
- Cache key format: `va_cache_ai_focus` with stored `tradeCount` field to detect changes
- No new database tables or migrations needed
- No new dependencies needed

