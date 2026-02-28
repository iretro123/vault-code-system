

## V1 Referrals Admin Tab

### Problem
The `referrals` table has no RLS policy allowing operators/admins to view all records. Need to add one, then build the admin tab component and wire it into the existing Admin Panel.

### Changes

#### 1. Database Migration — Add operator SELECT policy on `referrals`
```sql
CREATE POLICY "Operators can read all referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role));
```
This mirrors the pattern used by `stripe_webhook_events` and `user_activity_logs`.

#### 2. Create `src/components/admin/AdminReferralsTab.tsx`
New component following the exact same structure as `AdminStripeTab`:

- **Stats row** (5 compact cards): Total Referrals, Clicked, Signed Up, Unique Referrers, Last 7 Days
- **Data health card**: Count of rows missing `referred_user_id` on `signed_up` status, note that paid/converted tracking is not wired yet
- **Search bar** with debounce: searches referrer email, referred email, referrer/referred user IDs (partial match)
- **Status filter**: All / clicked / signed_up chips
- **Table columns**: Created, Status (badge), Referrer (email from profiles join), Referred (email/referred_email), Referral Code (truncated UUID + copy), Last Updated
- **Row click → detail dialog**: Full IDs, timestamps, raw status, copy buttons — same pattern as `WebhookEventDetailModal`
- **Fetch**: Query `referrals` joined with `profiles` (for referrer display name/email), limit 200, order by `created_at desc`
- **Logging**: `[AdminReferrals]` console logs for load count and errors

#### 3. Update `src/pages/academy/AdminPanel.tsx`
- Add `{ value: "referrals", label: "Referrals", icon: UserPlus, perm: "view_admin_panel" }` to `TAB_CONFIG` (after Stripe, before Logs)
- Import `AdminReferralsTab` and add matching `TabsContent`
- Import `UserPlus` from lucide-react

### Files
- **Migration**: Add operator read policy on `referrals`
- **New**: `src/components/admin/AdminReferralsTab.tsx`
- **Edit**: `src/pages/academy/AdminPanel.tsx` (3 small additions)

### Access Control
- Same `view_admin_panel` permission as Stripe/Logs tabs
- Server-side: operator RLS policy on `referrals`
- No new tables, no payouts, no schema changes beyond the RLS policy

