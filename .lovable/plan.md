

## Plan: Whop Checkout Referral Links with Tracking

### Problem
Currently the referral link points to `{origin}/auth?ref={userId}` which keeps users on-site. You want members to share a link that redirects to the Whop checkout (`https://whop.com/checkout/plan_2rZoF4rd1mLMc`) while still tracking who referred each click.

### Solution
Create a lightweight `/ref/:userId` redirect page. When someone clicks a member's unique link (e.g. `vault-code-system.lovable.app/ref/abc-123`), the page:
1. Logs a referral click in the `referrals` table (with the referrer's user ID)
2. Stores the referral in localStorage (so if they later sign up on the app, attribution is preserved)
3. Immediately redirects the visitor to the Whop checkout URL

Each member's link is unique because it contains their user ID.

### Changes

**1. New page: `src/pages/ReferralRedirect.tsx`**
- Reads `:userId` from the URL params
- Calls `captureReferral(userId)` to log the click + store attribution
- Immediately redirects to `https://whop.com/checkout/plan_2rZoF4rd1mLMc`
- Shows a brief "Redirecting..." state in case of slow connection

**2. `src/App.tsx`** — Add route
- Add `<Route path="/ref/:userId" element={<ReferralRedirect />} />`

**3. `src/components/academy/ReferralModal.tsx`** — Update the link
- Change `refLink` from `${window.location.origin}/auth?ref=${user?.id}` to `${window.location.origin}/ref/${user?.id}`
- Update copy text to reflect that it leads to the Whop checkout

**4. `src/lib/referralCapture.ts`** — No changes needed
- The existing `captureReferral()` function already handles click logging and localStorage storage. The redirect page will call it before navigating away.

### Files to modify
1. `src/pages/ReferralRedirect.tsx` (new)
2. `src/App.tsx` (add route)
3. `src/components/academy/ReferralModal.tsx` (update link URL)

