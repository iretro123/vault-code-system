# Engineering rules

- Paid return memberships bind only via `claim_vault_return_membership`, which requires a fresh email-link (OTP) session plus a server-written proof row; sessions older than the bind never inherit it. Why: email auto-confirm means `email_confirmed_at` is not proof of inbox ownership.
- Past-due Stripe/return memberships lock all member content via `vault_payment_locked` (checked inside `can_use_free_community`), unless `vault_access_for_user` grants independent access; the app shell only mirrors it via `get_my_payment_lock`. Why: server RLS must enforce the payment lock, not the UI.
