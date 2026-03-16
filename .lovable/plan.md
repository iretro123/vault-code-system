

# Game Plan: Email Alerts + Balance Adjustment Tracking

## Feature 1: Email Channel for Broadcasts (Preference-Aware)

### What exists today
- **Broadcast system** (Admin Panel → Broadcast tab) supports **In-App** and **SMS (GHL)** channels
- **User preferences** table has toggles: `notifications_enabled`, `notify_announcements`, `notify_new_modules`, `notify_coach_reply`, `notify_live_events`, `sounds_enabled`
- **No email domain** is configured yet — this is required before any email can be sent

### What we'll build

**Step 1 — Email domain setup**
Before any email can be sent, you need to set up a sender domain. This is a one-time setup where you configure a domain (e.g. `notify@yourdomain.com`) so emails come from your brand.

**Step 2 — Database changes**
- Add `preferred_alert_channel` column to `user_preferences` with values: `in_app`, `email`, `both` (default: `in_app`)
- Add `email` as a channel option in the broadcast system

**Step 3 — Edge function: `send-broadcast-email`**
- Accepts title, body, recipient type (all/single), and userId
- When sending to "all", queries `user_preferences` to respect each user's `preferred_alert_channel` — only sends email to users who chose `email` or `both`
- Also checks the relevant `notify_*` toggle (e.g. `notify_announcements`) based on broadcast template type
- Uses transactional email infrastructure

**Step 4 — UI changes**
- **Settings → Notifications**: Add an "Alert Channel" selector (In-App / Email / Both) below the master toggle
- **Admin Broadcast → Compose**: Add "Email" as a third channel option alongside In-App and SMS. When "All Members" is selected, show a note: "Only members who opted into email alerts will receive this"
- The broadcast `executeSend` logic branches to call `send-broadcast-email` when channel is `email`

**Step 5 — Preference-aware filtering**
When blasting to all members, the system will:
1. Check `notifications_enabled` — if off, skip entirely
2. Check the relevant category toggle (e.g. `notify_announcements`)
3. Check `preferred_alert_channel` — only deliver via channels they chose
This ensures no one gets pissed off by unwanted alerts.

---

## Feature 2: Balance Adjustments (Deposit/Withdrawal Tracking)

### The problem
The current "Update Balance" flow back-calculates a new `starting_balance` to make the math work: `new_starting = actual_balance - totalPnl`. This means when a user deposits $500 into their real trading account and updates their tracked balance, the system inflates `starting_balance`, which skews the equity curve baseline and makes it look like they never earned that $500 from trading. If they delete trades to fix it, they lose their history.

### What we'll build

**Step 1 — New `balance_adjustments` table**
```
balance_adjustments
  id             uuid PK
  user_id        uuid (references profiles)
  amount         numeric (positive = deposit, negative = withdrawal)
  adjustment_date date
  note           text (optional, e.g. "Weekly funding")
  created_at     timestamptz
```
RLS: users can CRUD their own rows.

**Step 2 — Updated balance formula**
Current: `Live Balance = starting_balance + SUM(trade P/L)`
New: `Live Balance = starting_balance + SUM(deposits - withdrawals) + SUM(trade P/L)`

This change touches:
- `AcademyTrade.tsx` — where `trackedBalance` and `totalPnl` are computed
- `EquityCurveCard.tsx` — equity curve baseline
- `coach-chat` edge function — student context balance

**Step 3 — UI: Replace confusing "Update Balance" with clear actions**
The current TrackedBalanceCard pencil icon opens a generic "What's your actual balance?" prompt. Replace with two clear buttons:
- **"Add Funds"** — opens a small form: amount + optional note + date. Inserts a positive `balance_adjustments` row. No back-calculation needed.
- **"Withdraw"** — same form but negative amount.
- Keep **"Reset Balance"** as the nuclear option for starting over.

The user's tracked balance automatically reflects deposits/withdrawals without touching trade data.

**Step 4 — Adjustment history**
Add a small collapsible section below the balance card showing recent deposits/withdrawals so users can verify and delete incorrect entries.

---

## Implementation order
1. Email domain setup (requires your action — you'll configure your sender domain)
2. Database migration: `preferred_alert_channel` column + `balance_adjustments` table
3. Settings UI: alert channel selector
4. Balance adjustments UI: Add Funds / Withdraw buttons + history
5. Broadcast email edge function + admin compose UI update
6. Wire preference-aware filtering into broadcast send logic

