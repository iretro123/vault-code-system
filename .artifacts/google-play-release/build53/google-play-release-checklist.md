# Vault OS Android / Google Play Release Checklist

Date: 2026-08-06

## Build Artifact

- App: Vault OS
- Public Play listing name: Vault OS - Trading Academy
- Package name: `com.vaulttradingacademy.vaultos`
- Version name: `1.0.6`
- Version code: `53`
- Target SDK: `36`
- Min SDK: `24`
- Billing permission: `com.android.vending.BILLING`
- Release bundle: `/Users/user/Documents/New project/vault-code-system/.artifacts/google-play-release/build53/VaultOS-1.0.6-53.aab`
- SHA-256: `2c59c2b720a47396aea47b0f9730eb8ce990be88056b54c00a982bb130c5e7bb`

## Google Play Subscription

Create this subscription in Google Play Console before live purchase testing:

- Product ID: `com.vaulttradingacademy.vaultos.fullaccess.monthly99v2`
- Name: Vault OS Full Access Monthly
- Type: Auto-renewing subscription
- Base plan: Monthly
- Price: `$99.00/month`
- Benefits copy: Full Vault OS access, lessons, tools, live areas, alerts, and member sections.

## Backend Required Before Billing Launch

These must be live in the production Supabase project used by the app:

- Apply migration: `supabase/migrations/20260806173000_android_membership_unlock.sql`
- Deploy Edge Function: `supabase/functions/activate-android-membership/index.ts`
- Confirm `supabase/config.toml` includes `[functions.activate-android-membership] verify_jwt = true`
- Set Supabase secrets:
- `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY`
- Optional: `GOOGLE_PLAY_PACKAGE_NAME=com.vaulttradingacademy.vaultos`
- Optional: `GOOGLE_PLAY_MONTHLY_PRODUCT_ID=com.vaulttradingacademy.vaultos.fullaccess.monthly99v2`

Google Cloud / Play Console setup required:

- Enable Google Play Android Publisher API.
- Create or use a service account for Google Play purchase verification.
- Grant that service account access in Play Console with permission to view financial/order/subscription data needed for purchase verification.

## Testing Track Requirement

For a newer Google Play personal developer account, Google requires closed testing before production access:

- Run a closed test with at least 12 opted-in testers.
- Testers must remain opted in for 14 continuous days before applying for production access.
- Start with internal testing if desired, but production access requires the closed-test requirement.

## Upload Steps

1. Create the app in Play Console.
2. Complete app content, privacy, data safety, target audience, financial features, and store listing.
3. Create the subscription product above.
4. Upload the `.aab` to internal testing first.
5. Add tester emails and confirm the app installs from Google Play, not sideload.
6. Promote to closed testing once store setup is complete.
7. Keep 12 testers opted in for 14 continuous days.
8. Apply for production access.

## Purchase Test Steps

Use a Play-installed test build, not a sideloaded APK:

1. Sign in as a free/basic Vault OS user.
2. Tap `View Full Access - $99/mo`.
3. Confirm Google Play loads the correct `$99/month` subscription.
4. Complete a licensed tester purchase.
5. Confirm `activate-android-membership` returns success.
6. Confirm `android_membership_activations` has the purchase token.
7. Confirm `basic_tier` / `free` role is removed.
8. Confirm `vault_access` role is active.
9. Confirm profile access status is active.
10. Relaunch app and confirm full access persists.
11. Tap Restore Purchase and confirm it is idempotent.

## Release Notes

Use short generic notes:

Improved Android app stability, notifications, chat, keyboard handling, and membership access.

## Current Known Limitation

The app-side Android billing implementation builds and launches, but a real Google Play purchase cannot be completed from a sideloaded emulator build. Final purchase validation requires the app to be uploaded to a Google Play testing track and installed through Google Play by a licensed tester.
