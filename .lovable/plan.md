

# Trading OS — Premium Stage Guidance + Full Pipeline Polish

## What Needs to Change

### 1. Stage Hero Headlines
Each stage currently has only a tiny 10px guidance line. Adding a **bold headline + subtitle** above the stage content creates instant clarity and makes the page feel like a structured product, not a dashboard. This is the single biggest "iOS app feel" lever.

```text
┌─────────────────────────────────────────────────┐
│  [Plan]  [Live]  [Review]  [Insights]           │
├─────────────────────────────────────────────────┤
│  Pre-Market Plan                                │
│  Build your trade. Size it. Get approved.       │
│                                                 │
│  [Stage content...]                             │
└─────────────────────────────────────────────────┘
```

Headlines per stage:
- **Plan**: "Pre-Market Plan" / "Build your trade. Size it. Get approved."
- **Live**: "Live Session" / "Follow your plan. Track your limits."  
- **Review**: "Session Review" / "Log results. Record what happened."
- **Insights**: "Performance Intelligence" / "AI-scanned behavior across your trades."

### 2. Backend Pipeline Gaps to Fix
Currently the Plan → Live → Review flow has these gaps:

**a) Session times are localStorage-only** — they don't persist across devices and aren't connected to any backend data. For now this is acceptable (session times are ephemeral per-day), but the `todayStatus` state resets on refresh because it's `useState` only. 

**Fix:** Persist `todayStatus` by checking if today's `journal_entries` (check-in) exists on mount, and if `todayTradeCount > 0` set to `in_progress`. This is already partially done (lines 98-102) but only fires when `todayTradeCount` changes, not on initial load.

**b) Review → Insights transition** — after check-in completes, `todayStatus` becomes "complete" and `useSessionStage` auto-navigates to Insights. This works. But the check-in completion doesn't persist — on refresh, status resets to `in_progress` if trades exist.

**Fix:** On mount, query `journal_entries` for today to determine if check-in was already done. If yes, set `todayStatus = "complete"`.

### 3. Plan Stage — Better Empty State
When no plan exists, the VaultTradePlanner renders but can feel empty initially. Add a brief "what to do" prompt above it when the planner is in its initial state.

### 4. Live Stage — Session End Auto-Transition
When `sessionPhase.label === "Session closed"`, show a prominent "Session ended — Review your trades" CTA that auto-suggests moving to Review.

### 5. Review Stage — No-Trade Day Option
The no-trade day button exists in classic layout but is missing from OS layout Review stage. Add it as a secondary action.

### 6. Remove Unnecessary Elements
- The `PerformanceHUD` in OS layout is redundant with the command bar metrics. It's not rendered in OS layout (only classic), so this is fine.
- The intelligence strip at bottom of hero card duplicates Insights stage content — keep it as a quick-glance shortcut, it works.

## Files Changed

1. **`src/pages/academy/AcademyTrade.tsx`**
   - Add stage hero headlines (bold title + subtitle) at the top of each stage's content area
   - Add `todayStatus` persistence: query `journal_entries` for today on mount
   - Add session-closed auto-transition CTA in Live stage
   - Add No-Trade Day button in Review stage
   - Tighten spacing, improve empty states

2. **`src/components/trade-os/OSTabHeader.tsx`**
   - Remove the inline `STAGE_GUIDANCE` text (moving it into the stage content as a proper subtitle)
   - Make the tab bar slightly taller for better touch targets

3. **`src/hooks/useSessionStage.ts`** — No changes needed (logic is correct)

4. **`src/components/trade-os/SessionSetupCard.tsx`** — No changes needed

5. **`src/components/trade-os/OSControlRail.tsx`** — No changes needed

## What Does NOT Change
- All approval calc logic, plan pipeline, trade log submission
- VaultTradePlanner internals, RiskRewardVisualizer
- Balance tracking, equity curve, performance breakdown
- Feature flag gating, modal/sheet components
- AI insights engine

