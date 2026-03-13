

# Trading OS — Priority Fix Implementation Plan

## Phase A: Functional Trust (Data Integrity)
**Goal:** Every user action persists to the database. Stage state survives refresh. Insights depend on real saved state.

### Changes

**1. `src/components/academy/QuickCheckInSheet.tsx`**
- Accept `userId` prop
- On submit: insert into `journal_entries` with `what_happened = didWell`, `biggest_mistake = hurt`, `lesson = focus`, `followed_rules = true`, `entry_date = today`
- Show loading state on button, disable double-submit
- Call `onComplete()` only after successful insert

**2. `src/components/academy/NoTradeDaySheet.tsx`**
- Accept `userId` prop
- On submit: insert into `journal_entries` with `what_happened = "No-trade day"`, `biggest_mistake = reason`, `lesson = note || "No trades taken"`, `followed_rules = true`, `entry_date = today`
- This ensures the mount-time query in AcademyTrade correctly detects "complete" status

**3. `src/pages/academy/AcademyTrade.tsx`**
- Pass `userId={user?.id}` to both sheets
- The existing mount-time `journal_entries` query (lines 118-133) already restores `todayStatus = "complete"` — this now works because data is actually saved
- Add `todayTradeCount` dependency to the mount query so it also sets `in_progress` correctly on first load
- Insights stage: no changes needed — it already reads from `entries` (trade_entries) and `cachedAI` which is populated by the edge function using real DB data. The auth fix (accessToken prop) is already in place.

### User-Facing Behavior After Phase A
- Check-in and no-trade day submissions survive page refresh
- Refreshing the page correctly shows the right stage (Review if trades exist, Insights if check-in done)
- AI Insights reliability unchanged (already functional)

---

## Phase B: True Workflow (Guidance + Enforcement)
**Goal:** Each stage tells the trader exactly what to do, what's next, and enforces session boundaries.

### Changes

**4. `src/pages/academy/AcademyTrade.tsx` — Plan Stage: "Today's Budget" card**
- Add a 3-metric summary card at the top of Plan stage (before planner):
  - **Daily Risk Budget**: `$${vaultState.daily_loss_limit}`
  - **Max Per Trade**: derived from risk mode (vaultState)
  - **Trades Allowed**: `${vaultState.max_trades_per_day}`
- Styled as a compact `rounded-lg border-white/[0.06]` row with large numbers
- Below it: clearer explanation of FITS/Recommended status when plan exists

**5. `src/pages/academy/AcademyTrade.tsx` — Live Stage: Execution moment**
- When plan exists and session is active, show explicit state: "Planned → Executing → Logged"
- Add "Mark Executing" button that updates `approved_plans.status` to a visual state (use local state for now — the plan already has `planned`/`logged`/`cancelled`)
- When marked executing, show trade duration timer and prominent "Close & Log" CTA
- Remove duplicate action buttons — consolidate to ONE primary CTA per stage

**6. `src/components/trade-os/SessionSetupCard.tsx` — Session enforcement**
- Export `sessionPhase` or expose via callback prop `onPhaseChange`
- When phase is "No new entries": show amber warning banner
- When phase is "Session closed": show red warning banner
- Pass phase info up to AcademyTrade

**7. `src/pages/academy/AcademyTrade.tsx` — Cutoff enforcement in Live stage**
- When session phase is "No new entries" or "Closed":
  - "Log Result" button shows warning state (amber border, "Override: log after cutoff" text)
  - Clicking logs the trade but also records `compliance_override: true` in trade notes
- Consolidate to single primary CTA per stage throughout

**8. `src/pages/academy/AcademyTrade.tsx` — Stage guidance copy**
- Expand `STAGE_HEADLINES` to include a `guidance` field:
  - Plan: "Set your budget, build a plan, get it approved. Then move to Live."
  - Live: "Your plan is active. Monitor limits. Log when done."
  - Review: "Log all trades, complete your check-in, then see what AI found."
  - Insights: "AI scans your last 50 trades for leaks, edges, and patterns."
- Show guidance as a subtle line below subtitle

**9. `src/components/trade-os/OSTabHeader.tsx`** — No structural changes needed

### Files Changed in Phase B
- `src/pages/academy/AcademyTrade.tsx` (budget card, execution state, enforcement, guidance, CTA consolidation)
- `src/components/trade-os/SessionSetupCard.tsx` (phase callback)
- `src/components/vault/TodaysLimitsSection.tsx` (update styling to `border-white/[0.06]`)

### User-Facing Behavior After Phase B
- Opening Plan stage immediately shows "Today you can risk $X across Y trades"
- FITS/Recommended meaning is explained inline
- Live stage has a clear "I'm executing now" → "Close & Log" flow
- Session cutoff shows warning; logging after cutoff is possible but flagged
- Every stage has clear "what to do here" and "what happens next" guidance
- One primary action button per stage instead of 3-4 competing ones

---

## Phase C: Usability & Mobile Polish
**Goal:** Clean mobile experience, reduced clutter, stronger decision framing.

### Changes

**10. `src/pages/academy/AcademyTrade.tsx` — Hide right rail on mobile**
- Add `hidden md:block` to the right rail container (line 794)
- Mobile users see stage content only — risk/session info is already in stage content and Welcome Hero

**11. `src/components/trade-os/OSTabHeader.tsx` — Mobile tab optimization**
- Below `md` breakpoint: show icons only (no label text)
- Above `md`: show icon + label as now
- Slightly increase touch target on mobile

**12. `src/pages/academy/AcademyTrade.tsx` — Welcome Hero: remove duplicate Log button on mobile**
- On mobile, hide the "Log Trade" button in the Welcome Hero (it's available inside each stage)

**13. `src/components/vault-planner/VaultTradePlanner.tsx` — Decision framing (light touch)**
- No structural changes, but after approval add a clearer "What this means" line:
  - FITS: "This trade fits your rules. You're cleared."
  - OVERSIZED: "This exceeds your risk limit. Reduce size or accept the override."
- This is a copy change in the planner's approval display section

### Files Changed in Phase C
- `src/pages/academy/AcademyTrade.tsx` (right rail hidden, hero cleanup)
- `src/components/trade-os/OSTabHeader.tsx` (icon-only mobile)
- `src/components/vault-planner/VaultTradePlanner.tsx` (approval copy)

### User-Facing Behavior After Phase C
- Mobile shows clean single-column stage content without the redundant right rail
- Tabs show icons only on small screens — no text cramming
- One Log button visible at a time instead of 4
- Planner clearly explains what FITS/OVERSIZED means in plain English

---

## Summary Table

| Phase | Files | Core Outcome |
|-------|-------|-------------|
| **A** | QuickCheckInSheet, NoTradeDaySheet, AcademyTrade | Data persists. Stage state survives refresh. |
| **B** | AcademyTrade, SessionSetupCard, TodaysLimitsSection | Budget visible. Execution tracked. Cutoffs enforced. One CTA per stage. |
| **C** | AcademyTrade, OSTabHeader, VaultTradePlanner | Mobile-clean. No clutter. Clear decision language. |

### Added Audit Items (Addressed)
- **No single session model**: Phase B addresses this by making the session timer enforce real boundaries and connecting execution state to the plan lifecycle
- **Competing action entry points**: Phase B (CTA consolidation) + Phase C (mobile cleanup) reduces to one primary action per stage
- **Planner needs decision framing**: Phase C adds plain-English approval explanations

