

# Fix: Add "Log Trade" Button to Review Stage

## Problem
The Review stage currently shows "Log a Trade" only when zero trades exist. Once at least one trade is logged, the only CTA is "Complete Check-In." A trader who took 3 trades but only logged 1 has no way to log the remaining trades from the Review stage — on any device.

## Fix
Add a secondary "Log Another Trade" button in the Review stage that appears whenever `todayStatus !== "complete"` (i.e., the session isn't finalized). It sits below the session summary and above the "Complete Check-In" button.

## File Changed
**`src/pages/academy/AcademyTrade.tsx`** — inside the Review stage `entries.length > 0` branch (around line 782), add a secondary outline button:

```
+ Log Another Trade (Plus icon, outline variant, full width)
```

Placed after the session summary stats row and before the "Complete Check-In" button. Uses `handleLogUnplanned` (already defined). Visible on all screen sizes including mobile.

