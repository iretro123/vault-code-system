# Vault OS Build 19 Pre-Submit Checklist

Status date: June 18, 2026

This checklist is for the local Vault OS build before any App Store resubmission.

## 1. Subscription purchase-flow compliance

Pass criteria:
- The paywall shows the subscription title.
- The paywall shows the subscription duration.
- The paywall shows the subscription price.
- The paywall shows a visible `Terms of Use (EULA)` link before purchase.
- The paywall shows a visible `Privacy Policy` link before purchase.
- Both links open on iPhone and iPad.

Current app status:
- Implemented in `/Users/user/Documents/New project/vault-code-system/src/pages/MembershipUpgrade.tsx`
- Also surfaced before paid continuation in `/Users/user/Documents/New project/vault-code-system/src/pages/CreateAccount.tsx`
- Link handling uses `/Users/user/Documents/New project/vault-code-system/src/lib/externalLinks.ts`

## 2. In-app account deletion compliance

Required Apple path:
- `Settings -> Account -> Delete Account`

Pass criteria:
- Delete Account button exists.
- Warning text explains deletion is permanent.
- Confirmation step requires typing `DELETE`.
- Live backend request is made.
- Success state is shown.
- User is signed out after deletion.
- Deleted account cannot continue using the app.

Current app status:
- Account screen: `/Users/user/Documents/New project/vault-code-system/src/components/settings/SettingsAccount.tsx`
- Delete UI: `/Users/user/Documents/New project/vault-code-system/src/components/settings/DeleteAccountCard.tsx`
- Settings routing: `/Users/user/Documents/New project/vault-code-system/src/pages/academy/AcademySettings.tsx`
- Basic-tier shortcut: `/Users/user/Documents/New project/vault-code-system/src/pages/basic/BasicHome.tsx`
- Paywall shortcut: `/Users/user/Documents/New project/vault-code-system/src/pages/MembershipUpgrade.tsx`

## 3. Live backend deletion verification

Live function:
- `https://oemylhcjqncovnmvvgxh.supabase.co/functions/v1/delete-account`

Verified behavior:
- Unauthenticated requests return `401 Unauthorized`.
- Authenticated requests delete only the currently signed-in user.
- Requests cannot delete a different user by passing another user id.
- Related user-owned data is deleted or anonymized server-side.
- Deleted users can no longer sign in.
- Frontend exposes only the publishable Supabase key, not service-role/admin credentials.

Implementation files:
- `/Users/user/Documents/New project/vault-code-system/supabase/functions/delete-account/index.ts`
- `/Users/user/Documents/New project/vault-code-system/src/integrations/supabase/client.ts`

## 4. Local build verification

Verified:
- Web production build succeeded.
- `cap sync ios` succeeded.
- iPad Air 11-inch (M3) simulator build succeeded.
- iPad Air 11-inch (M3) simulator install succeeded.
- App launch on the iPad Air 11-inch (M3) simulator succeeded.
- Release archive for build `19` succeeded at:
  - `/Users/user/Documents/New project/vault-code-system/.artifacts/app-store-upload/build19/VaultOS-1.0-19.xcarchive`

Known local packaging note:
- IPA export on this Mac currently fails because Xcode could not find an `iOS Distribution` certificate for export.
- This does not change the code/backend compliance status, but it should be resolved before a final App Store upload.

## 5. App Store Connect metadata reminder

Before the next resubmission, confirm both metadata fields are filled:
- Privacy Policy field contains the Privacy Policy URL.
- App Description or EULA field contains the Terms of Use / EULA URL.

Reference:
- `/Users/user/Documents/New project/vault-code-system/.artifacts/app-review-compliance/app-store-connect-subscription-metadata-checklist.md`

## 6. User recording target

Use the separate recording guide:
- `/Users/user/Documents/New project/vault-code-system/.artifacts/app-review-compliance/physical-device-recording-script-build19.md`
