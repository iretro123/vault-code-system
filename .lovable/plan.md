

## Plan: Phase 2A — Access Gating + Upgrade CTA (Revised)

### 1. Database migration: `get_my_access_state()` RPC + RLS

Create one SQL migration with:

**a) RLS policies** for `students` and `student_access` so authenticated users can read their own rows:
- `students`: SELECT where `auth_user_id = auth.uid()`
- `student_access`: SELECT where `user_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid())`

**b) `get_my_access_state()` function** (SECURITY DEFINER):
- Joins `students` (by `auth_user_id = auth.uid()`) → `student_access` (by `user_id = students.id`)
- Returns: `student_id`, `product_key`, `tier`, `status`, `stripe_customer_id`, `updated_at`, `has_access` (boolean: status IN ('active','trialing'))
- Returns single row (latest by `updated_at`) or NULL row if no access

### 2. New hook: `src/hooks/useStudentAccess.ts`

- Calls `supabase.rpc('get_my_access_state')` 
- Exposes: `status` ('active'|'trialing'|'past_due'|'canceled'|'none'), `tier`, `productKey`, `hasAccess`, `loading`, `error`, `refetch()`, `lastUpdated`
- 60s localStorage cache (`va_cache_student_access`)
- Console logs with `[AccessGate]` prefix
- Admin/operator bypass: if `useAcademyPermissions().isOperator || isCEO` → force `hasAccess = true`

### 3. Checkout return handling in `AcademyHome.tsx`

- Read `?checkout=success` / `?checkout=canceled` from `useSearchParams`
- On success: toast "Payment received. Finalizing access…", poll `refetch()` every 3s for up to 30s, stop when `hasAccess` becomes true, show success toast
- On cancel: info toast
- Clear params via `navigate(pathname, { replace: true })`

### 4. Soft-gate strategy (NOT hard-gate)

No changes to `AcademyLayout.tsx`. Instead, selectively gate premium page content:
- In `AcademyLearn`, `AcademyPlaybook`, `AcademyTrade`, `AcademyJournal`, `AcademyLive`: import `useStudentAccess`, if `!hasAccess`, render a simple upgrade card instead of page content
- Dashboard, Settings, Admin, Community remain accessible
- Keep existing `access_status === 'revoked'` check in AcademyLayout

### 5. Dashboard Upgrade CTA in `HeroHeader.tsx`

- Import `useStudentAccess`
- When `!hasAccess` (and not admin/operator): show "Join Vault Academy" button next to Create dropdown
- When `past_due`/`canceled`: show "Update Billing" button (placeholder)
- Button calls `supabase.functions.invoke('create-checkout')`, opens returned URL in same tab
- Loading spinner + error toast + popup-blocked fallback link

### 6. No new Settings billing nav

Skip entirely for this pass.

### Files to create
- `src/hooks/useStudentAccess.ts`
- One SQL migration

### Files to modify
- `src/components/academy/dashboard/HeroHeader.tsx` — upgrade CTA
- `src/pages/academy/AcademyHome.tsx` — checkout return handling
- `src/pages/academy/AcademyLearn.tsx` — soft gate
- `src/pages/academy/AcademyPlaybook.tsx` — soft gate
- `src/pages/academy/AcademyTrade.tsx` — soft gate
- `src/pages/academy/AcademyJournal.tsx` — soft gate
- `src/pages/academy/AcademyLive.tsx` — soft gate

### What will NOT change
- Stripe edge functions / webhooks
- AcademyLayout shell
- Admin panel
- Settings pages
- Community pages

