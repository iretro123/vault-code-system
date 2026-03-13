

# Trading OS — Enhanced Stage Flow & R:R Visualization

## What's Being Built

Three major enhancements to the `/academy/trade` OS:

### 1. Plan Stage — R:R Visualizer + Brokerage Guide

After a user selects a contract size and sees the Hero Decision Card, add a **Risk:Reward Visualizer** that shows:
- Tappable **1:1 / 1:2 / 1:3** ratio buttons (styled like the uploaded probability meter — green profit zone on top, red risk zone on bottom)
- When tapped, each shows a **visual bar chart** with the exact dollar amounts from their plan (e.g., Risk $100 → 1:2 = $200 profit)
- Below: a **"What to do on your broker"** mini-guide — 3 concise steps for options:
  1. "Buy {contracts} {ticker} {direction} at ${entry}"
  2. "Set stop-loss exit at ${exitPrice}"  
  3. "Set profit target at ${selectedTarget}"
- This replaces the current small "Targets" grid in the HeroDecisionCard with a richer, interactive component

**New component**: `src/components/vault-planner/RiskRewardVisualizer.tsx`
- Props: `riskPerContract`, `contractPrice`, `contracts`, `tp1`, `tp2`, `tp3`, `exitPrice`, `ticker`, `direction`
- Three tappable ratio cards with animated green/red bar visualization
- Selected ratio highlights and shows the broker instruction panel
- Premium dark styling matching the OS aesthetic

### 2. Live Stage — Session Start Flow + Plan Carry-Forward

Redesign the Live stage to feel like a **mission control launch**:

**When entering Live with a plan:**
- Show the approved plan summary at top (already exists)
- Add a **"Start Session"** flow: user must input session start time, cutoff time, and close time BEFORE the session activates
- This replaces the separate session timer in the right rail — move it inline into the Live stage content
- Once session starts: show a **live dashboard** with countdown timers, plan details carried from Plan tab, and risk/trade status
- The plan's R:R target selection (from Plan stage) carries into Live as the "active target"

**Changes to `AcademyTrade.tsx` Live stage section:**
- Add session start gate (if no times set, show time input form inline)
- Once started, show: active plan card + session timer + limits + restrictions
- "Log Result" button becomes prominent when session is active

**Changes to `OSControlRail.tsx`:**
- When Live stage is active AND session times are set, show compact timer in rail
- Session times input moves from rail to Live stage content (more prominent, better UX)

### 3. Review Stage — Trade Logger as Ritual

Keep existing review flow but enhance:
- When session ends (hard close time passed), auto-suggest transitioning to Review
- Make "Log a Trade" the primary full-width action (not a small card)
- After logging, "Complete Check-In" becomes the primary CTA
- Add a "Session Summary" row showing: session duration, trades taken, P/L

### 4. Insights Stage — Minimum 10 Trades Gate

Add a gate in the Insights stage:
- If `entries.length < 10`: show a progress indicator ("7/10 trades needed for AI analysis") with a clean progress bar
- If `entries.length >= 10`: show existing AI insights grid + AIFocusCard

### 5. Files Changed

1. **`src/components/vault-planner/RiskRewardVisualizer.tsx`** — NEW — Interactive R:R bar chart with broker instructions
2. **`src/components/vault-planner/VaultTradePlanner.tsx`** — Replace Targets grid in HeroDecisionCard with RiskRewardVisualizer
3. **`src/pages/academy/AcademyTrade.tsx`** — Redesign Live stage with session start flow, move session time input from rail to Live content, add Insights 10-trade gate, add session summary to Review
4. **`src/components/trade-os/OSControlRail.tsx`** — Simplify: remove session time editing (moved to Live stage), keep compact countdown only when times are set

### What Does NOT Change
- All approval calc logic in `vaultApprovalCalc.ts`
- Plan save/cancel/replace pipeline
- Trade log submission pipeline
- Equity curve, performance breakdown, AI engine
- Stage progression logic in `useSessionStage`
- Balance tracking

