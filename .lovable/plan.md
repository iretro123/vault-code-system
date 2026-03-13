

# Workflow Clarity & User Guidance Pass

## What is still confusing to a new trader

1. **No stage description** — tabs say "Plan / Live / Review / Insights" but nothing explains what each one means or what to do there. A trader sees panels, not a workflow.

2. **No session timing** — there's no concept of "when can I trade," "when should I stop entering," or "when should I close." The Live tab shows stats but no time structure.

3. **"FITS" is jargon** — the approval status labels (FITS/TIGHT/PASS) have no explanation. A new user has no idea what "FITS" means.

4. **Stage transitions are invisible** — nothing tells the user "you're done with Plan, move to Live now" or "you have trades, complete your review." The segmented control looks like tabs, not a progression.

5. **Live tab with no plan is a dead end** — it says "No Active Plan" and "Check a trade in the Plan tab first" but doesn't strongly guide the user back.

6. **Right rail labels are cryptic** — "Risk Budget," "Trades," small numbers with no explanation of what they mean for the user's session.

7. **No data trust signals** — nothing says "this is your real balance" or "this plan is saved and active." The user has to trust the numbers blindly.

## Plan

### 1. Stage Guidance Microcopy (OSTabHeader + AcademyTrade)

Add a **stage description bar** below the segmented control that changes per active stage:

- **Plan**: "Build your trade plan. Enter ticker, direction, entry, stop, and target. The calculator will size your position and approve or deny."
- **Live**: "Your session is active. Monitor your plan, track risk, and follow your rules. Log your result when the trade closes."
- **Review**: "Log your trade result, record mistakes and lessons, and complete your daily check-in."
- **Insights**: "AI analyzes your trading behavior. See your risk grade, biggest leak, strongest edge, and next action."

These are 1-line descriptions — `text-[11px] text-muted-foreground/50` — below the tabs. Not paragraphs.

### 2. Stage Progress Indicator

Add numbered step indicators to the tab buttons: `①` Plan → `②` Live → `③` Review → `④` Insights. Shows it's a sequence, not random tabs. Completed stages get a checkmark instead of a number.

### 3. Session Timing Module (new component in Live tab)

Create a **SessionSetupCard** that reads from `user_preferences` (or localStorage as a first pass) for:
- Session Start time
- No-New-Entry Cutoff time  
- Hard Close / Review time

Display live countdowns when in the Live stage. This uses the existing `SessionTimer` pattern from `src/components/academy/live/SessionTimer.tsx` — same countdown logic, adapted for the OS.

The session times will be stored in localStorage keyed by date (matching the existing `session-boundary-alerts` memory). If no times are set, show a "Set Session Times" prompt with 3 time inputs.

### 4. Approval Status Explainers (VaultTradePlanner)

When showing FITS/TIGHT/PASS badges, add a single-line explainer:
- **FITS**: "This trade fits your risk rules. You're clear to execute."
- **TIGHT**: "This trade is near your limits. Proceed with caution."
- **PASS**: "This trade exceeds your risk rules. Do not take this trade."

These are inline `text-[10px]` lines below the badge — no modal, no tooltip.

### 5. Active Plan Clarity

When an active plan exists (Plan or Live tab), show a structured summary:
- Ticker + Direction + Contracts (already there)
- **Add**: "Max risk: $X · Invalidation: $Y · Ready to execute"
- **Add**: data trust label: `text-[9px] text-muted-foreground/30` — "Plan saved · Updates live"

### 6. Right Rail Explainers (OSControlRail)

Add brief descriptions under each section label:
- Risk Budget: "How much you can lose today"
- Trades: "Entries used vs. allowed"
- Active Plan: "Your approved trade for this session"

These are `text-[10px] text-muted-foreground/30` — one line each.

### 7. Smart Stage Transition Prompts

At the bottom of each stage's content, add a **next step prompt**:
- Plan (with active plan): "Plan approved. → Go to Live Mode" button
- Live (with trades logged): "Trade logged. → Complete your Review" button
- Review (check-in done): "Session complete. → View Insights" button

These replace the current "Insights →" ghost buttons with stronger, contextualized CTAs.

### 8. Data Trust Signals

Add subtle "live data" indicators:
- Metrics strip: tiny `•` dot next to "Balance" label that pulses green — signals live data
- Intelligence strip: "Last scan: today" or "Updated 2h ago" timestamp
- Right rail status: "Synced" micro-label

## Files Changed

1. **`src/components/trade-os/OSTabHeader.tsx`** — Add step numbers, stage description bar
2. **`src/pages/academy/AcademyTrade.tsx`** — Stage transition prompts, active plan explainers, data trust signals, session timing integration in Live tab
3. **`src/components/trade-os/OSControlRail.tsx`** — Section sub-descriptions
4. **`src/components/trade-os/SessionSetupCard.tsx`** — **NEW** — Session time inputs + live countdowns for Live stage
5. **`src/components/vault-planner/VaultTradePlanner.tsx`** — FITS/TIGHT/PASS explainer lines

## What does NOT change
- All data flow (unified balance, plan state, AI auth — already fixed)
- All handlers and hooks
- All modal/sheet components
- Lower analytics cards
- Core approval calc logic

