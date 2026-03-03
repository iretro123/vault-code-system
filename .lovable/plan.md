

## Cancellation/Failed Payment Popup with Reactivation

### What's Already Working
- The **webhook** correctly handles `invoice.payment_failed` (sets `past_due`), `customer.subscription.updated` (maps all statuses), and `customer.subscription.deleted` (sets `canceled`). This is solid.
- Individual premium pages (Learn, Playbook, Trade, Journal, Live) already show `PremiumGate` when `hasAccess` is false.

### What Needs to Change

**1. Make the gate a full-screen blocking modal instead of per-page inline**

Right now, `PremiumGate` only blocks individual pages. If a user's status is `past_due` or `canceled`, they can still browse Dashboard, Community, Settings, etc. 

Create an `AccessBlockModal` — a non-dismissable dialog that renders on top of the entire app when `status` is `past_due` or `canceled`. This prevents any interaction until they reactivate.

**2. Add it to the AcademyLayout (single point of enforcement)**

Inside `AcademyLayout`, check `useStudentAccess()`. If `status` is `past_due` or `canceled` (and not admin bypass), render the blocking modal. This covers every academy page automatically.

**3. The modal content**

- **Past Due**: "Your payment failed. Update your billing to restore access." Button: "Update Billing" → calls `create-billing-portal` to open Stripe Customer Portal.
- **Canceled**: "Your subscription has been canceled." Button: "Reactivate Account" → calls `create-billing-portal` (Stripe portal allows resubscription if configured) with a fallback to `create-checkout` if no Stripe customer exists.
- Non-dismissable (no X button, no ESC, no click-outside).

**4. Real-time refresh**

Add a `visibilitychange` listener so when the user returns from Stripe portal/checkout, `useStudentAccess.refetch()` fires automatically to check if their status changed back to `active`.

### Files to Create/Edit
- **Create**: `src/components/academy/AccessBlockModal.tsx` — the blocking dialog
- **Edit**: `src/components/layout/AcademyLayout.tsx` — add the modal
- No webhook changes needed (already handles all status transitions correctly)

### Technical Detail
The modal uses Radix `AlertDialog` with no close button. The "Update Billing" button calls `create-billing-portal` which opens Stripe Customer Portal where they can update payment method or resubscribe. The "Reactivate" button for canceled users also tries `create-billing-portal` first (portal supports resubscription), falling back to `create-checkout` if no Stripe customer link exists.

