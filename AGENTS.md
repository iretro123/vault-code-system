# Engineering rules

- Paid return memberships bind only via `claim_vault_return_membership`, which requires a fresh email-link (OTP) session plus a server-written proof row; sessions older than the bind never inherit it. Why: email auto-confirm means `email_confirmed_at` is not proof of inbox ownership.
