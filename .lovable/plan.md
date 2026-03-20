

## Trade OS → Risk-First Daily Ritual — IMPLEMENTED

### Summary
Surgical refinement of the existing 4-stage Trade OS. Removed contract input from the default flow, reframed stages as a daily ritual, and upgraded the Live stage into a session control room.

### Changes Made

| File | Change |
|------|--------|
| `OSTabHeader.tsx` | Renamed tabs: Start Your Day, Go Live, Review, My Insights |
| `OSControlRail.tsx` | Updated STAGE_INFO labels/descriptions, risk-only plan display |
| `AcademyTrade.tsx` | Rebuilt Plan + Live stage content, updated headlines, review prefill |
| `useSessionStage.ts` | Updated DAY_STATE_META status strings |
| `ContractFrameworkCard.tsx` | New — contract-type guidance (collapsible) |
| `RewardTargetsStrip.tsx` | New — reward target display |
| `LiveSessionMetrics.tsx` | New — live session metrics grid |
| `VaultStatusBadge.tsx` | New — vault status indicator |
| `FocusReminderCards.tsx` | New — rule reminder cards for Live stage |

### Architecture Preserved
- 4-stage workflow (plan → live → review → insights)
- Risk engine (`vaultConstants.ts`, `tradePlannerCalc.ts`)
- Session persistence, timer, end-session flow
- Review/Insights core logic
- Database schema (approved_plans accepts 0 values for entry_price/contracts)
- All existing styling system
