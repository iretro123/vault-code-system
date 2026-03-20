

## Trade OS → Risk-First Daily Ritual — Refinement Plan

### Summary
Surgical refinement of the existing 4-stage Trade OS. No rebuild. Remove contract input from the default flow, reframe stages as a daily ritual, and upgrade the Live stage into a session control room.

---

### Phase 1: Rename Stages

**Files: `OSTabHeader.tsx`, `OSControlRail.tsx`, `AcademyTrade.tsx`, `useSessionStage.ts`**

Update labels only — no logic changes:
- Plan → **Start Your Day**
- Live → **Go Live**
- Review → **Review** (unchanged)
- Insights → **My Insights**

Update `STAGE_HEADLINES` in AcademyTrade.tsx:
- "Start Your Day" / "Install your risk rules before you trade."
- "Go Live" / "Trade your session. Stay inside your rules."
- "Session Review" / "Did you follow your plan?"
- "My Insights" / "AI-scanned behavior across your trades."

Update `STAGE_INFO` descriptions and hints in OSControlRail.tsx to match ritual language.

Update `DAY_STATE_META` status strings in useSessionStage.ts (e.g., "No plan" → "Set your rules to start").

---

### Phase 2: Rebuild "Start Your Day" Content

**File: `AcademyTrade.tsx` (lines ~767–898)**

Replace the current Plan stage content entirely. Remove VaultTradePlanner from the default flow.

New layout — all using existing styling patterns:

1. **Daily Risk Rules Card** (non-collapsible, replaces current collapsible budget summary)
   - Account balance (large, prominent) with "Update Balance" button
   - Risk % selector (existing 1/2/3% buttons — keep as-is)
   - 2×3 metric grid: Max Daily Loss, Risk Per Trade, Max Contracts, Max Trades, Stop After X Losses, Max Spend
   - Direction bias selector (existing Calls/Puts toggle)
   - Ticker input (optional, kept from existing)

2. **Session Window Preview** — show the 3 time slots (start/cutoff/hard close) inline so traders set this at plan time, not Live time. Reuse `SessionSetupCard` logic but render a compact version.

3. **Reward Targets Card** (new, small)
   - Quick PT, 1:1, 1:2, 1:3 guidance based on risk per trade
   - Pure calculation: if risk is $50, 1:1 = $50 gain, 1:2 = $100, etc.

4. **Contract Framework Card** (new, collapsible)
   - Based on account size + risk per trade + direction
   - Shows: preferred expiration style (0DTE / next-day / weekly), ATM/near-ATM guidance, max contracts, what to avoid
   - Pure client-side logic — no AI, no DB
   - Small helper text per recommendation

5. **Primary CTA**: "Lock In Today's Rules" → saves a risk-only approved plan (`entry_price_planned: 0`, `contracts_planned: 0`, direction, risk snapshot) and auto-advances to Go Live

6. **Active Plan Card** (existing — adapt to show risk rules instead of contract details when `entry_price_planned === 0`)

7. **Day Complete state** — keep as-is

---

### Phase 3: Rebuild "Go Live" Content

**File: `AcademyTrade.tsx` (lines ~901–972)**

Replace current Live stage content. Remove Luxury Plan Summary with contract details.

New layout:

1. **Stage Headline**: "Trade Your Session"

2. **Vault Status Badge** — large, prominent status indicator
   - GREEN → "Clear" with emerald glow
   - YELLOW → "Caution" with amber glow
   - RED → "Locked" with red glow
   - Uses existing `vaultState.vault_status`

3. **Session Metrics Grid** (2×3)
   - Daily Loss Buffer: `vaultState.risk_remaining_today`
   - Risk Per Trade: from risk engine
   - Max Contracts: from risk engine
   - Trades Remaining: `vaultState.trades_remaining_today`
   - Loss Streak: `vaultState.loss_streak`
   - Stop Rules: "Stop after {MAX_LOSSES_PER_DAY} losses"

4. **Reward Targets Strip** — same as Plan stage but compact (Quick PT / 1:1 / 1:2 / 1:3)

5. **Session Timer** — keep existing `SessionSetupCard` + `SessionCountdownLine`

6. **Focus Reminder Cards** (2-3 small cards)
   - "Today's Rules" — direction, max loss, max trades
   - "Session Rules" — your window times
   - "Focus Prompt" — short motivational ("Follow the plan. That's it.")

7. **Quick Log Trade CTA** — button that opens `LogTradeSheet`

8. **End Session CTA** — keep existing red pill button

---

### Phase 4: Review Stage Tweaks

**File: `AcademyTrade.tsx` (lines ~976–1050)**

- When `activePlan.entry_price_planned === 0` (risk-only plan), the "Yes, I followed it" prefill skips `entryPrice` and `positionSize` — only prefills ticker and direction
- All other Review logic stays identical

---

### Phase 5: Hook & Data Adjustments

**File: `useApprovedPlans.ts`**
- Verify `savePlan` works with `entry_price_planned: 0`, `contracts_planned: 0` (DB columns are NOT NULL but accept 0 — confirmed)
- No changes needed, just verification

**File: `useSessionStage.ts`**
- `DAY_STATE_META` status text updates (ritual language)
- No logic changes — `hasActivePlan` is a boolean, works regardless of contract data

---

### New Components

**`src/components/trade-os/ContractFrameworkCard.tsx`** (new)
- Collapsible card with contract-type guidance
- Inputs: account balance, risk per trade, direction
- Outputs: expiration style, strike guidance, max contracts, what to avoid
- Pure client-side calculation, no DB

**`src/components/trade-os/RewardTargetsStrip.tsx`** (new)
- Horizontal row showing Quick PT / 1:1 / 1:2 / 1:3 dollar amounts
- Input: risk per trade amount
- Compact styling matching existing metric cards

**`src/components/trade-os/LiveSessionMetrics.tsx`** (new)
- Grid of live session metrics (buffer, risk, contracts, trades, streak, stop rules)
- Receives vault state as props

**`src/components/trade-os/VaultStatusBadge.tsx`** (new)
- Large status indicator: Clear / Caution / Locked
- Color-coded with glow effects using existing styling

**`src/components/trade-os/FocusReminderCards.tsx`** (new)
- 2-3 small rule-reminder cards for the Live stage

---

### Files Changed Summary

| File | Change |
|------|--------|
| `OSTabHeader.tsx` | Rename 4 tab labels |
| `OSControlRail.tsx` | Update STAGE_INFO labels, descriptions, hints, active plan display |
| `AcademyTrade.tsx` | Rebuild Plan + Live stage content, update headlines, review prefill |
| `useSessionStage.ts` | Update DAY_STATE_META status strings |
| `ContractFrameworkCard.tsx` | New — contract-type guidance |
| `RewardTargetsStrip.tsx` | New — reward target display |
| `LiveSessionMetrics.tsx` | New — live session metrics grid |
| `VaultStatusBadge.tsx` | New — vault status indicator |
| `FocusReminderCards.tsx` | New — rule reminder cards |

### What Does NOT Change
- Database schema
- Risk engine (`vaultConstants.ts`, `tradePlannerCalc.ts`)
- `VaultTradePlanner.tsx` (kept in codebase, just not rendered in default flow)
- Session persistence, timer, end-session flow
- Review/Insights core logic
- All existing styling system
- Mobile layout, sidebar, AppLayout
- Balance persistence (existing `SetStartingBalanceModal` + `useBalanceAdjustments`)
- Auth, permissions, feature flags

