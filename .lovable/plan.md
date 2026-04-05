

## Fix: Vault AI Coach Drawer — Mobile Fit & Sizing

### Problem
On mobile, the drawer uses `h-[100dvh]` which makes it full-screen but the composer at the bottom gets clipped by the iPhone home indicator / Android nav buttons. The card is also too tall — it should feel like a floating card, not a full-screen takeover.

### Fix

**`src/components/academy/CoachDrawer.tsx`**

**Line 534 — Modal container classes:**
- Change `h-[100dvh]` to `h-[calc(100dvh-3rem)]` on mobile so it floats with breathing room at top
- Add `mb-[env(safe-area-inset-bottom,0px)]` to push it above the home bar
- Add `rounded-2xl` on mobile (currently only `rounded-t-2xl`)

**Line 783 — Composer bottom padding:**
- Change `pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]` to `pb-[calc(1rem+env(safe-area-inset-bottom,12px))]` — more generous padding so the input and send button are fully visible and tappable

### Files Changed
- `src/components/academy/CoachDrawer.tsx`

