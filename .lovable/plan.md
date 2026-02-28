

## Phase 2B — Admin Stripe Operations + Manual Controls

### Findings

- `AdminStripeTab` already has student detail panel (`StudentDetail` component), webhook events table, stats cards, and search — all functional
- `audit_logs` table exists with columns: `id`, `admin_id`, `target_user_id`, `action`, `metadata` (jsonb), `created_at` — sufficient for admin action logging (reuse it, no new table needed)
- `student_access` table has all needed columns including `status`, `product_key`, `tier`, `updated_at`
- Existing RLS on `student_access` allows operator writes (via `has_role` which now bypasses subscription gate)
- Webhook function has `upsertAccess` and `resolvePlan` helpers — reconcile edge function can reuse same PRICE_MAP pattern
- `stripe_webhook_events` has `payload_json` (jsonb) for full event detail view

### Implementation

#### 1. Database: RPC for admin access override (server-side validation)

Create `admin_override_access` RPC (SECURITY DEFINER):
- Params: `target_student_id uuid`, `new_status text`, `reason text`
- Validates caller is operator/vault_os_owner via `has_role()`
- Captures before-state from `student_access`
- Updates `student_access.status` (+ `access_ended_at` if revoked/canceled, `access_granted_at` if granting active)
- Inserts audit log into `audit_logs` with metadata containing `before_state`, `after_state`, `reason`, `action_type`
- Returns `{ success, before_status, after_status }`

#### 2. Edge Function: `reconcile-access`

New edge function that:
- Accepts `student_id` param
- Validates caller is operator (via JWT)
- Looks up student's `stripe_customer_id` or `stripe_subscription_id`
- Fetches latest subscription from Stripe API
- Applies same PRICE_MAP logic as webhook
- Upserts `student_access` accordingly
- Logs to `audit_logs`
- Returns `{ changed, previous_status, new_status, reason }`

#### 3. Expand `AdminStripeTab.tsx` — Webhook Event Detail

- Make webhook event rows clickable → open a Dialog/modal
- Show: `stripe_event_id`, `event_type`, `status`, `trace_id`, `email`, `received_at`, `processed_at`, `error_message`
- Collapsible JSON preview of `payload_json` (need to fetch it since current query doesn't select it)
- "Copy event ID" and "Copy trace ID" buttons

#### 4. Expand `StudentDetail` component — Identity + Admin Tools

Add to existing `StudentDetail`:
- **Identity section**: student ID, auth_user_id, stripe_customer_id with copy buttons
- **Manual Access Override section** (visible only to operator/CEO):
  - Dropdown: Grant Active / Mark Past Due / Revoke Access
  - Required reason text input
  - Confirmation dialog before submit
  - Calls `admin_override_access` RPC
  - Loading/disabled states, success/error toasts
- **Reconcile button**:
  - "Reconcile from Stripe" button
  - Calls `reconcile-access` edge function
  - Shows result (changed/no_change, before/after status)
  - Loading state + toast

#### 5. Update webhook events query to include `payload_json`

Add `payload_json` to the `WebhookEventRow` interface and select query (only fetched on detail view click to keep list queries light — or fetch all since limit is 100).

### Files to create
- `supabase/functions/reconcile-access/index.ts`
- One SQL migration (admin_override_access RPC)

### Files to modify
- `src/components/admin/AdminStripeTab.tsx` (webhook detail modal, student detail expansion, override actions, reconcile button)
- `supabase/config.toml` (add reconcile-access function config)

### What will NOT change
- Stripe webhook edge function
- create-checkout edge function  
- End-user gating UI
- Admin panel layout/structure
- Other admin tabs

