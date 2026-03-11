

# Add Delete Trade — Swipe-to-Reveal X Button

## Approach
Add a subtle **X** button on the top-right of each trade card. Tapping it reveals an inline confirmation strip at the bottom of that card: "Type DELETE to confirm" with input + confirm/cancel. Matches the existing balance-reset pattern. Only one card can be in delete-mode at a time.

## Changes

### 1. `src/hooks/useTradeLog.ts` — Add `deleteEntry`
- New async function: `supabase.from("trade_entries").delete().eq("id", id).eq("user_id", user.id)`
- On success: remove from local state + cache, show success toast
- On error: show destructive toast
- Return from hook

### 2. `src/pages/academy/AcademyTrade.tsx` — UI changes

**RecentTradesSection** gets new props and state:
- Accept `onDelete: (id: string) => Promise<void>` prop
- Local state: `deletingId` (which card is in delete mode), `confirmText` (input value), `isDeleting` (loading)

**Each trade card** (line ~882):
- Add a small `X` icon button (top-right corner, `text-muted-foreground/40` → `hover:text-rose-400`, 28px touch target)
- On click: sets `deletingId` to that card's ID

**When `deletingId === e.id`**, render an inline confirmation strip below the badges:
- Muted background strip with: `Type DELETE to confirm` label, small input, Cancel (ghost) + Confirm (destructive, disabled until input === "DELETE") buttons
- Cancel resets `deletingId` to null
- Confirm calls `onDelete(e.id)`, shows toast, resets state

**Parent component** (line ~266):
- Pass `onDelete` from `useTradeLog().deleteEntry` to `RecentTradesSection`

### UX Details
- X button is always visible but very subtle (low opacity), brightens on hover — luxury feel
- Confirmation is inline (no modal interruption) — fast for intentional deletes
- "DELETE" typing requirement prevents accidents without being annoying
- Only one card in delete-mode at a time — clean UI

