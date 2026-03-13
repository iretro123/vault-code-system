

# VAULT Trading OS — Launch-Ready Rebuild Plan

## Bug Audit

### Bug 1: Balance Mismatch
**Root cause**: Two independent balance computations.
- `AcademyTrade.tsx` line 79: fetches `profiles.account_balance` → stores in `startingBalance` → computes `trackedBalance = startingBalance + totalPnl` using its own `useTradeLog()` instance.
- `VaultTradePlanner.tsx` line 107: independently fetches `profiles.account_balance` → stores in its own `startingBalance` → computes `accountBalance = startingBalance + totalPnl` using a **separate** `useTradeLog()` instance.
- These two hooks maintain separate caches (`va_cache_trade_entries`) and can have different `totalPnl` values, especially after a trade is logged in one but not refetched in the other.

**Fix**: Pass `trackedBalance` and `totalPnl` as props into `VaultTradePlanner` instead of letting it fetch independently. Remove the duplicate `profiles.account_balance` fetch and `useTradeLog()` call from `VaultTradePlanner`.

### Bug 2: "Not authenticated" on Insights
**Root cause**: `AIFocusCard` calls `supabase.auth.getSession()` (line 78). This returns null when the session token has expired or if the component mounts before the auth listener fires. The error message "Not authenticated" is thrown at line 79.

**Fix**: Use `supabase.auth.getSession()` with a fallback retry. If session is null, wait briefly and retry once. Also, the `useAuth()` hook should already have the session — pass the access token as a prop or use the hook inside `AIFocusCard` to avoid the race condition.

### Bug 3: VaultTradePlanner uses its own `useApprovedPlans` hook
This creates a second subscription to the same data. `AcademyTrade` already has `activePlan` — it should pass this down to avoid dual-fetch and potential state drift.

## Data Flow Unification

### Single Source of Truth Architecture
```text
AcademyTrade (page)
├── profiles.account_balance → startingBalance (ONE fetch)
├── useTradeLog() → totalPnl, entries (ONE instance)
├── trackedBalance = startingBalance + totalPnl
├── useApprovedPlans() → activePlan (ONE instance)
├── useVaultState() → vaultState (via context, already shared)
│
├── VaultTradePlanner ← receives: trackedBalance, totalPnl, activePlan, onPlanSaved
├── AIFocusCard ← receives: entries, accessToken (from useAuth)
├── OSControlRail ← receives: activePlan, vaultState, stage
└── Intelligence Strip ← reads: cachedAI (localStorage)
```

**Changes to VaultTradePlanner**:
- Add props: `balance?: number`, `totalPnl?: number`, `activePlan?: ApprovedPlan | null`, `onPlanSaved?: () => void`
- When these props are provided, skip internal fetches (use prop values instead)
- When not provided (standalone page usage), keep existing internal fetches as fallback
- This is a non-breaking change — all existing standalone usages continue working

**Changes to AIFocusCard**:
- Accept optional `accessToken` prop
- If provided, use it directly instead of calling `getSession()`
- Add fallback: if `getSession()` returns null, call `auth.refreshSession()` once before erroring

## Visual Redesign Plan

### 1. Metrics Strip — Premium Fintech Bar
- Increase number size to `text-lg` with `font-bold` for stronger hierarchy
- Add subtle gradient background: `bg-gradient-to-r from-card via-card to-card` with a faint primary tint on the left edge
- Use `gap-0` with `divide-x` (current approach) but add `min-h-[56px]` for confidence
- Balance label → show as primary colored number (source of truth emphasis)

### 2. Tab Navigation — True Segmented Control
- Replace current loose buttons with a contained pill strip
- Background: `bg-muted/5 rounded-lg p-0.5 mx-4 mt-3 mb-1` (inset container)
- Active tab: `bg-card rounded-md shadow-sm` (raised, card-colored)
- Inactive: transparent, `text-muted-foreground/40`
- Remove bottom underline bar — the raised card IS the indicator
- Result: iOS-style segmented control feel

### 3. Hero Card — Tighter, Sharper
- Reduce border to `border-border/8`
- Add `shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]` (subtle depth)
- Left zone: `p-5` with no wasted space
- Right rail border: `border-l border-border/8` (barely visible divider)
- Intelligence strip: tighten to `py-1.5`, stronger grade badge

### 4. Right Rail — Utility Sidebar
- Width stays `flex-[0.75]`
- Remove `divide-y` (too many lines), use `space-y-4` with visual grouping
- Vault status: larger dot (3px), bolder label
- Plan summary: more prominent ticker with subtle accent background
- Quick Action: primary button only when there IS a clear action, ghost otherwise

### 5. Stage Content — Purpose-Built

**Plan**: When VaultTradePlanner is shown, remove ALL surrounding padding/cards — let the planner's own premium styling fill the zone. When a plan exists, show a clean summary with "Log Result" as the only CTA.

**Live**: Grid layout for session metrics (3-col). Active plan as a compact banner. Limits as inline rows, not another card. Primary CTA always visible at bottom.

**Review**: Action row with hover-highlight interaction (current is good). Trade list with alternating subtle backgrounds for scanability. Check-in CTA as a persistent bottom bar when trades exist but check-in is pending.

**Insights**: AIFocusCard fills the zone with no wrapper. Remove any surrounding div padding beyond what the card itself provides.

### 6. Typography & Color
- Greeting: keep `text-xl` but add `text-foreground/90` (slightly softer)
- Status line: `text-xs text-muted-foreground/50` (quieter)
- Section labels throughout: remove ALL-CAPS tracking overkill, use `text-[10px] font-medium text-muted-foreground/30 uppercase tracking-wide`
- Numbers: `tabular-nums font-semibold` consistently
- Positive/negative colors: emerald-400 / red-400 (already correct)

### 7. Lower Analytics
- Reduce vertical gap between analytics cards
- Use `opacity-80` on the section label to push it further back
- No changes to card internals — they're already well-designed

## Implementation Files

1. **`src/components/vault-planner/VaultTradePlanner.tsx`** — Add optional props for balance/plan passthrough, skip internal fetches when props provided
2. **`src/components/trade-os/AIFocusCard.tsx`** — Fix auth race condition with session refresh fallback
3. **`src/pages/academy/AcademyTrade.tsx`** — Pass unified data to VaultTradePlanner, redesign metrics/tabs/hero/stage content visuals
4. **`src/components/trade-os/OSTabHeader.tsx`** — Rebuild as iOS segmented control
5. **`src/components/trade-os/OSControlRail.tsx`** — Remove divide-y, cleaner grouping

## What Does NOT Change
- All handlers (trade submit, log from plan, cancel, check-in, balance update/reset)
- All hooks (useTradeLog, useApprovedPlans, useVaultState, useSessionStage)
- All data pipelines (trade_entries writes, balance updates, AI edge function)
- All modal/sheet components
- All lower analytics components (equity, breakdown, recent, weekly)
- Classic layout fallback

## Launch-Readiness Checklist
1. Balance: ONE source → passed everywhere
2. AI: auth race condition fixed → no "Not authenticated"
3. Tabs: iOS segmented control → premium feel
4. Stage content: purpose-built, no empty shells
5. Right rail: utility sidebar, not card stack
6. Metrics: strong numbers, unified bar
7. Typography: cleaner hierarchy, less noise
8. No fake states, no dead panels

