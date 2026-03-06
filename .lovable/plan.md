

## Security Audit Report

I've conducted a thorough security scan across your entire codebase — edge functions, client code, RLS policies, secrets management, and authentication flows. Here's what I found:

---

### CRITICAL Findings (Fix Immediately)

**1. `generate-reports` edge function has NO authentication**
- This function uses `SUPABASE_SERVICE_ROLE_KEY` directly with zero auth checks. Anyone can call it and trigger report generation for ALL users' `daily_memory` data.
- **Fix:** Add JWT validation + operator role check before processing.

**2. `provision-manual-access` edge function has NO authentication**
- Accepts `email` and `auth_user_id` from the request body with no JWT validation. An attacker could provision access for any email/user_id pair, bypassing all billing gates.
- **Fix:** Add JWT auth + operator role check, or restrict to service-role-only invocation.

**3. `ghl-password-reset` edge function has NO authentication**
- Accepts any email and generates a password recovery link via `admin.generateLink`. An attacker could enumerate emails and trigger mass password reset floods via GHL (SMS + email).
- **Fix:** Add rate limiting or require authentication. At minimum, verify the email belongs to an existing user before generating links.

**4. `check-stripe-customer` edge function has NO authentication**
- Called from the signup page without a JWT. This means anyone can probe whether an email exists in your Stripe or Whop systems — an email enumeration vulnerability.
- **Fix:** This is partially by design (pre-signup check), but the response should be generic. Currently it returns `{ found: true, status: "active" }` which confirms membership status to unauthenticated callers.

**5. `allowed_signups` table leaks emails to anonymous users**
- The RLS policy `Anon can read unclaimed allowed signups` allows unauthenticated users to query this table and see whitelisted email addresses (e.g., `csassouni94@gmail.com`, `chris@invasiondigitalmedia.com`).
- **Fix:** Remove the anon SELECT policy. The `check-stripe-customer` function already handles signup gating server-side.

---

### HIGH Findings

**6. `profiles` table exposes PII to all authenticated users**
- Any authenticated user can read ALL profiles including `email`, `phone_number`, `display_name`, and `username`. This is a privacy violation.
- **Fix:** Restrict the SELECT policy so users can only read their own full profile. Create a separate limited view or function for community features (display_name + avatar only).

**7. `inbox_items` broadcast messages can be modified by any user**
- The UPDATE policy allows any authenticated user to update items where `user_id IS NULL` (broadcast messages). A malicious user could modify system notifications.
- **Fix:** Change the UPDATE policy to only allow `user_id = auth.uid()` (remove the `OR user_id IS NULL` clause).

**8. Leaked password protection is disabled**
- Supabase's built-in leaked password detection is turned off. Users can register with known-compromised passwords.
- **Fix:** Enable leaked password protection in authentication settings.

---

### MODERATE Findings

**9. Role caching in localStorage (low risk, already mitigated)**
- `useAuth.tsx` caches user roles in localStorage (`va_cache_role`). This is used as a UI hint only — actual enforcement happens via RLS and edge function role checks — so this is acceptable. However, the `AdminModeContext` also uses localStorage for admin mode toggle state. Since `canToggle` is derived from server-verified permissions (`useAcademyPermissions`), this is safe.

**10. CORS is `Access-Control-Allow-Origin: *` on all edge functions**
- All edge functions allow requests from any origin. For admin/sensitive functions, this should be restricted to your domain.
- **Fix:** For non-webhook functions, restrict origin to `vault-code-system.lovable.app` and your preview domain.

---

### CLEAN (No Issues Found)

- All API keys (Stripe, Whop, GHL, Lovable AI) are stored as backend secrets, never exposed client-side
- No hardcoded secrets in frontend code
- No `dangerouslySetInnerHTML` with user content (only used in chart.tsx with static themes)
- No `console.log` of sensitive data in client code
- Stripe webhook properly validates signatures
- Admin-delete-user properly checks operator role
- `search-stripe-customers` properly checks operator role
- `list-whop-members` properly checks operator role
- `create-billing-portal` properly validates JWT
- `create-checkout` properly validates JWT
- `reconcile-access` properly validates JWT
- `instant-answer` properly validates JWT
- `coach-chat` properly validates JWT
- `playbook-signed-url` properly validates JWT

---

### Implementation Plan

**Database migrations (3 RLS policy fixes):**
1. Drop `Anon can read unclaimed allowed signups` policy on `allowed_signups`
2. Restrict `profiles` SELECT policy to own profile + a security-definer function for community lookups
3. Fix `inbox_items` UPDATE policy to remove `OR user_id IS NULL`

**Edge function fixes (3 functions):**
1. `generate-reports` — add JWT + operator role check
2. `provision-manual-access` — add JWT + operator role check
3. `ghl-password-reset` — add basic protections (verify email exists before generating link)

**Auth config:**
1. Enable leaked password protection

This is a 7-change plan across database policies, edge functions, and auth config. No frontend changes needed — all issues are backend security.

