

## Remove Session Setup from "Start Your Day" — Keep it in "Go Live" Only

### Problem
The `SessionSetupCard` (Set Your Session Window) appears in **two places**:
1. **Start Your Day** — inside the "Session & Targets" collapsible (line 888)
2. **Go Live** — as Card 2 "Your Session" (line 997)

The session window belongs exclusively in Go Live. Having it in Start Your Day is confusing — that stage should only be about risk rules, direction, and ticker.

### Changes — `AcademyTrade.tsx`

**1. Remove `SessionSetupCard` from the "Session & Targets" collapsible (line 888)**
- Delete `<SessionSetupCard onPhaseChange={setSessionPhase} />` from the collapsible
- Rename the collapsible trigger from "Session & Targets" to just "Reward Targets" since only `RewardTargetsStrip` remains
- Update the icon if needed (keep `Target`)

**2. Keep everything in Go Live as-is (line 997)**
- No changes — the session setup card stays in Go Live where it belongs

That's it — one surgical removal + label rename. The session phase callback on Go Live's instance already handles all phase tracking.

| File | Change |
|------|--------|
| `AcademyTrade.tsx` | Remove SessionSetupCard from Start Your Day collapsible, rename trigger label |

