

## Fix: "Share Vault" Referral Modal Disappears on Mobile

### Root Cause

The `ReferralModal` is rendered **inside** `AcademySidebar` (line 323). When a mobile user taps "Share Vault", the click handler on line 260 calls `setOpenMobile(false)` first, then `setReferralOpen(true)`. Closing the mobile sidebar unmounts the entire sidebar content — including the `ReferralModal`. So the modal opens for a split second, then gets destroyed when the sidebar finishes closing.

### Fix

Move `ReferralModal` state and rendering **out of** `AcademySidebar` and into `AcademyLayout`, where it won't be affected by the sidebar open/close state.

**1. `src/components/layout/AcademySidebar.tsx`**
- Remove the `referralOpen` state and `<ReferralModal>` render from this file
- Instead, dispatch a custom event (`open-referral-modal`) when "Share Vault" is clicked, same pattern already used for `toggle-coach-drawer`
- The click handler becomes: `if (isMobile) setOpenMobile(false); window.dispatchEvent(new CustomEvent("open-referral-modal"));`

**2. `src/components/layout/AcademyLayout.tsx`**
- Add `referralOpen` state here
- Listen for the `open-referral-modal` custom event and set `referralOpen(true)`
- Render `<ReferralModal open={referralOpen} onOpenChange={setReferralOpen} />` alongside the other layout-level components (CoachDrawer, MobileNav, AccessBlockModal)

This ensures the modal lives at the layout level and is never unmounted by the sidebar closing.

### Files Changed
- `src/components/layout/AcademySidebar.tsx`
- `src/components/layout/AcademyLayout.tsx`

