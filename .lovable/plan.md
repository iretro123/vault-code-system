

## Phase 3 — Launch Hardening

### Security Audit Findings (no changes needed)

1. **Secrets safety**: No `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` references found in `src/`. All Stripe secrets are used only in edge functions. No patch needed.
2. **Webhook security**: `stripe-webhook` verifies signatures via `stripe.webhooks.constructEventAsync(body, sig, webhookSecret)` (line 63). Invalid signatures return 400. Idempotency check exists (lines 72-86). No patch needed.
3. **Admin action authorization**: `admin_override_access` RPC uses `SECURITY DEFINER` with `has_role()` check. `reconcile-access` edge function validates JWT + checks operator/vault_os_owner role server-side. No patch needed.
4. **Access gating source of truth**: `useStudentAccess` calls `get_my_access_state` RPC against `student_access` table. No client-only unlock path exists. No patch needed.
5. **RLS policies**: `stripe_webhook_events` and `audit_logs` have proper operator/admin-only RLS. `student_access` queries go through RPC. No patch needed.

**Result: All security checks pass. No fixes required.**

### Implementation Plan

#### 1. Database: Create `user_activity_logs` table + RLS

New migration:
- Table `user_activity_logs` with columns: `id uuid`, `user_id uuid`, `event_name text`, `page_key text (nullable)`, `metadata_json jsonb (nullable)`, `created_at timestamptz default now()`
- RLS: users can INSERT own rows, users can SELECT own rows, operators can SELECT all
- No foreign key to auth.users

#### 2. Create usage logging hook: `src/hooks/useActivityLog.ts`

- Lightweight hook exporting a `logActivity(event_name, page_key?, metadata?)` function
- Best-effort: catches errors silently (no UX impact)
- Uses `supabase.from('user_activity_logs').insert(...)` 

#### 3. Wire usage logging into existing components (minimal diffs)

Add `logActivity` calls to:
- `AcademyHome.tsx`: `login` on mount, `checkout_return_success`, `checkout_return_canceled`
- `SettingsBilling.tsx`: `billing_portal_opened`, `checkout_started`
- `AcademyLayout.tsx` or page components: `page_view` for dashboard/learn/live/community/settings (single hook at layout level using pathname)

#### 4. Add "Access Timeline" section to `StudentDetail` in `AdminStripeTab.tsx`

Compact collapsible section showing:
- Current access status + updated_at
- Last webhook event type + status + date
- Last 3 audit log entries for this student (fetched from `audit_logs`)
- Labeled "Access Timeline"

#### 5. Add "System Health" checklist card to `AdminStripeTab.tsx`

Small collapsible card at bottom showing:
- STRIPE_WEBHOOK_SECRET configured (static green — we know it's set)
- STRIPE_SECRET_KEY configured (static green)
- Recent webhook events count (from existing data)
- Admin can read webhook logs (green if events loaded)
- Access resolver check (show current user's own status via `useStudentAccess`)
- Simple green/amber/red indicators

#### 6. Add "Test Steps" collapsible note to `AdminStripeTab.tsx`

Replace or extend existing test flow card with collapsible QA helper text covering:
- Test card number
- Where to verify webhook events
- How to test duplicate replay
- How to test billing portal return
- How to test past_due handling

### Files to create
- SQL migration (user_activity_logs table)
- `src/hooks/useActivityLog.ts`

### Files to modify
- `src/components/admin/AdminStripeTab.tsx` (timeline section, system health card, test steps)
- `src/pages/academy/AcademyHome.tsx` (add activity logging calls)
- `src/components/settings/SettingsBilling.tsx` (add activity logging calls)
- `src/components/layout/AcademyLayout.tsx` (page_view logging)

### What will NOT change
- Stripe webhook function
- create-checkout / create-billing-portal functions
- reconcile-access function
- Admin panel layout
- Customer-facing UI design
- useStudentAccess hook
- RLS policies on existing tables

