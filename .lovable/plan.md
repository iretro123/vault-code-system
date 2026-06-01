The issue is not the sidebar filter itself. The account currently has two role rows in the database: `free` and `basic_tier`. The app uses `.maybeSingle()` to load one role, so it can read `free` and treat the user as a full Academy member. That is why Dashboard, Trade OS, Community, Live, Schedule, Settings, Ask Coach, Share Vault, and Inbox are still visible.

Plan:

1. Fix the account data
- Remove the duplicate lower-priority `free` role row for `appreview+1778972025@vault.dev`.
- Leave the user as `basic_tier` only.

2. Make role loading deterministic
- Update auth role loading so if a user ever has multiple role rows, the app chooses the most restrictive/basic-only role correctly instead of relying on `.maybeSingle()`.
- Prevent this exact failure from happening again if duplicate roles exist later.

3. Stop rendering the full Academy shell while role is unresolved
- Update the loading gate so Academy navigation does not render until both auth and role resolution are complete.
- Avoid showing the full sidebar during loading for basic-tier users.

4. Preserve the Learn-only experience
- Keep only `/academy/learn` and `/academy/learn/:moduleSlug` allowed for `basic_tier`.
- Keep all other Academy URLs redirecting to `/academy/learn`.
- Keep the basic-tier sidebar/mobile nav limited to Learn only, with non-Learn actions hidden.

Validation:
- Confirm the database shows only `basic_tier` for the review account.
- Confirm the code no longer uses single-row role assumptions that break on duplicate roles.
- Confirm the screenshot state can no longer happen: only Learn remains visible for this account.