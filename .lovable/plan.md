

## V1 Referral Tracking Hardening

### Current State
- Auth.tsx captures `?ref=` into `sessionStorage` (volatile — lost on tab close)
- On signup, inserts into `referrals` table with `status: signed_up`
- Modal uses `user.id` as ref code (UUID — not readable, but stable)
- Modal copy says "Affiliate Program", "Earn rewards", implies live commissions
- No click tracking, no TTL, no dedupe, no debug logging

### Changes

#### 1. Create `src/lib/referralCapture.ts` (new file)
Centralized referral capture utility:
- `captureReferral(refCode)`: validates UUID format, stores to `localStorage` with 30-day TTL timestamp, dedupes (skip if same code already stored), logs `[Referral] captured: ...`
- `getStoredReferral()`: reads from localStorage, checks TTL expiry, returns code or null
- `clearStoredReferral()`: removes from localStorage
- Best-effort click tracking: upsert to `referrals` table with `status: clicked` (fire-and-forget, no await blocking)
- Session-level dedupe via `sessionStorage` flag to prevent repeated click inserts on refresh

#### 2. Update `src/App.tsx`
- Add a top-level `<ReferralCaptureProvider />` component (or inline effect) inside BrowserRouter that reads `?ref=` from URL on mount and calls `captureReferral()`
- This ensures capture works on ANY landing page (not just `/auth`)

#### 3. Update `src/pages/Auth.tsx`
- Replace `sessionStorage.getItem("vault_ref")` with `getStoredReferral()` from the new utility
- Replace `sessionStorage.removeItem("vault_ref")` with `clearStoredReferral()`
- Add `[Referral]` console logs for signup attribution
- Remove the existing `useEffect` that stores ref to sessionStorage (handled by App-level capture now)

#### 4. Update `src/components/academy/ReferralModal.tsx` (copy only)
- Change pill from "Affiliate Program" → "Invite Traders"
- Change headline from "Invite traders. Earn rewards." → "Invite traders. Grow the community."
- Change subtitle to: "Share Vault OS with other traders. Referral tracking is live — rewards coming soon."
- Update STEPS to remove commission language:
  1. "Share your invite link"
  2. "They sign up and join Vault"
  3. "We track every referral you bring in"
- Add small note under stats: "Rewards and credits expand in a future update."
- Update GUIDELINES_TEXT to remove reward/commission references for V1

### Files to modify
- `src/lib/referralCapture.ts` (new)
- `src/App.tsx` (add capture effect)
- `src/pages/Auth.tsx` (use new utility)
- `src/components/academy/ReferralModal.tsx` (copy updates)

