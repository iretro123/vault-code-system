

## Plan: Fix Referral Tracking (Make It Actually Work)

### Analysis

Each user's link **is** unique — it uses their UUID (`/ref/{userId}`). But the tracking pipeline is broken at step 1:

**Problem**: When someone clicks a referral link, `captureReferral()` tries to insert a `clicked` row into the `referrals` table. But the visitor is **not authenticated** (they're a stranger clicking a link). The RLS policy requires `auth.uid() IS NOT NULL`, so the insert **silently fails**. No click is ever recorded, which means the `referral_stats` view always returns 0.

The signup attribution code (in `Signup.tsx`) tries to update a `clicked` row to `signed_up`, but since no click row exists, it falls back to inserting — which also may fail if the user's session isn't fully established yet.

### Fix

**1. Database migration** — Allow anonymous click tracking
- Drop the current INSERT policy that requires authentication
- Add a new INSERT policy allowing `anon` role to insert rows with `status = 'clicked'` only
- Keep the authenticated insert policy for signup attribution

```sql
-- Allow anonymous click inserts (referral link visitors)
DROP POLICY "Authenticated users can insert referrals" ON public.referrals;

CREATE POLICY "Anyone can insert clicked referrals"
  ON public.referrals FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'clicked' OR auth.uid() IS NOT NULL);
```

**2. `src/lib/referralCapture.ts`** — No code changes needed, the insert will now succeed for anonymous visitors.

**3. `src/pages/Signup.tsx`** — Minor fix: ensure the signup attribution insert (fallback path) works by using the authenticated session properly. Current code looks correct but add a small delay to ensure the session is established before the referral insert.

**4. `src/components/academy/ReferralModal.tsx`** — The stats display already reads from `referralStats` in context. Once data flows in, the "X invited · Y joined" line will update live. No changes needed here.

### Files to modify
1. **SQL migration** — Fix RLS on `referrals` table to allow anonymous click inserts
2. **`src/pages/Signup.tsx`** — Ensure referral attribution runs after session is confirmed

