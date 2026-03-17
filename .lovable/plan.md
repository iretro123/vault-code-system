

# Fix Live Stage — Remove Hidden Drawer, Make It Intuitive

## Problem
The Live stage hides critical session info (timer, limits, end session) behind a "Session Details" collapsible drawer with a tiny chevron. Traders don't know what it means, miss it entirely, and hate having to click to reveal essential controls.

## Solution
**Kill the collapsible.** Show everything directly in a clear, labeled layout:

1. **Session Timer always visible** — `SessionSetupCard` shown directly with a clear "YOUR SESSION WINDOW" label above it
2. **Today's Limits always visible** — `TodaysLimitsSection` shown with "TODAY'S LIMITS" label
3. **End Session button** always visible when session is active (no hiding)
4. **Better section labels** — Replace "Session Details" with clear uppercase micro-labels: "YOUR SESSION WINDOW", "TODAY'S LIMITS"

## File: `src/pages/academy/AcademyTrade.tsx` (lines ~978-994)

Replace the `<Collapsible>` block wrapping SessionSetupCard + TodaysLimitsSection + End Session with direct rendering:

```
{/* Before (remove entirely): */}
<Collapsible>
  <CollapsibleTrigger>Session Details</CollapsibleTrigger>
  <CollapsibleContent>
    <SessionSetupCard />
    <TodaysLimitsSection />
    {End Session button}
  </CollapsibleContent>
</Collapsible>

{/* After: */}
<div className="space-y-2.5 pt-1">
  <SectionLabel>Your Session Window</SectionLabel>
  <SessionSetupCard onPhaseChange={setSessionPhase} />
  
  <SectionLabel>Today's Limits</SectionLabel>
  <TodaysLimitsSection balanceOverride={trackedBalance ?? undefined} />
  
  {sessionPhase && (
    <button ...>End Session</button>
  )}
</div>
```

Also fix low-contrast text in the live stage:
- Status bar plan info: `text-muted-foreground/60` → `text-foreground/60`
- Trades counter: keep as-is (already `/60`)
- Cutoff banner text: `text-muted-foreground/60` → `text-foreground/60`

## Files touched

| File | Change |
|------|--------|
| `src/pages/academy/AcademyTrade.tsx` | Remove Collapsible, show session + limits directly with labels |

