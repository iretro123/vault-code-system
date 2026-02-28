

## Phase 2C — Billing Portal + Upgrade UX

### Confirmed: STRIPE_SECRET_KEY is available in secrets. All prerequisites met.

### Security correction applied
`create-billing-portal` will NOT have `verify_jwt = false` in config.toml. It will be omitted (defaults to JWT required), and the function will additionally validate the user via `getClaims()`.

---

### 1. Edge Function: `supabase/functions/create-billing-portal/index.ts`

- Require `Authorization: Bearer` header — return 401 if missing
- Validate JWT via `getClaims(token)` — return 401 if invalid
- Use service role client to query `students` by `auth_user_id = claims.sub`
- If no student or no `stripe_customer_id` → return `{ error: "no_stripe_customer" }` with 404
- Create `stripe.billingPortal.sessions.create({ customer, return_url })` where return_url = `origin/academy/settings?billing=returned`
- Return `{ url }`
- Log with `[BillingPortal]` prefix

### 2. Config: `supabase/config.toml`

Add entry WITHOUT `verify_jwt = false`:
```toml
[functions.create-billing-portal]
```
This keeps default JWT verification enabled.

### 3. New component: `src/components/settings/SettingsBilling.tsx`

- Import `useStudentAccess` for `status`, `tier`, `hasAccess`, `isAdminBypass`
- Status badge with color coding:
  - active/trialing → green
  - past_due → amber  
  - canceled → red
  - none → gray
- Tier display if available
- Buttons:
  - Status !== 'none' (has stripe customer): **"Manage Billing"** → calls `supabase.functions.invoke('create-billing-portal')`, opens returned URL
  - Status === 'none': **"Join Vault Academy"** → calls `supabase.functions.invoke('create-checkout')`, opens URL
- Loading states + error toasts
- Popup blocker fallback: if `window.open` returns null, use `window.location.href`
- Helper text: "Billing changes are managed securely via Stripe."
- Handle `?billing=returned` via toast on mount

### 4. Update: `src/pages/academy/AcademySettings.tsx`

- Add `CreditCard` icon import from lucide-react
- Add `{ id: "billing", label: "Billing", icon: CreditCard }` to `NAV_ITEMS`
- Add `{ id: "billing", Component: SettingsBilling }` to `PANELS`
- Read `?billing=returned` from `useSearchParams` → auto-select billing tab + clear param
- Update `SectionId` type (derived from NAV_ITEMS, automatic)

### Files to create
- `supabase/functions/create-billing-portal/index.ts`
- `src/components/settings/SettingsBilling.tsx`

### Files to modify
- `src/pages/academy/AcademySettings.tsx` (add billing nav + panel)
- `supabase/config.toml` (register function, NO verify_jwt = false)

### What will NOT change
- Stripe webhook / create-checkout / reconcile-access
- Admin panel
- Dashboard / HeroHeader upgrade CTA
- AcademyHome checkout return handling
- useStudentAccess hook

