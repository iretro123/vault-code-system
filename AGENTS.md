# Engineering rules

- Paid return memberships bind only via `claim_vault_return_membership`, which requires a fresh email-link (OTP) session plus a server-written proof row; sessions older than the bind never inherit it. Why: email auto-confirm means `email_confirmed_at` is not proof of inbox ownership.
- Past-due Stripe/return memberships lock all member content via `vault_payment_locked` (= `vault_billing_past_due` AND NOT `vault_access_for_user`, checked inside `can_use_free_community`); Stripe-linked allowlist rows are admission only, and unknown prices only reconcile an existing row bound to the same subscription/customer. Why: server RLS enforces billing, and the helpers must stay acyclic.
