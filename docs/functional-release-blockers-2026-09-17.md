# Functional launch hardening — September 17, 2026

## Status

Not a release sign-off. The current branch contains local fixes that still require staged deployment and a signed release-device pass. Nothing was submitted to either app store or published to production in this pass.

## New defects reproduced and addressed

1. **Android crashes after successful login without Firebase configuration.** Android 16/API 36 emulator log recorded `Default FirebaseApp is not initialized` in Capacitor push registration, killing the app. Added a native availability check and made registration fail safely before calling the crash-prone plugin. Missing push configuration reports unsupported rather than pretending notification delivery works. Clean-install retest successfully signed in and navigated Chat/Learn/Home/Menu/Live/Home. Firebase configuration and actual delivery testing remain required.
2. **Android software keyboard covers the Community composer.** The real emulator keyboard reduced `visualViewport.height` to about 491 CSS px while `innerHeight` remained 914 and the composer started at y=799. Native layout now follows the visible viewport, restores on dismissal, and avoids reflow during pinch zoom. Added regression tests; emulator screenshot verification recorded separately below.
3. **Android welcome page says Restore Apple Purchase.** Corrected platform-specific copy: Apple on iOS, Google Play on Android, Manage membership on web. Three regression tests added. Native Android test verified the Google Play label; no purchase/restore was initiated.
4. **Account deletion lacks uploaded-file cleanup.** Added service-only, bounded inventory RPC and Storage API cleanup before profile/account rows are removed. Exact owner ID filters, legacy-owner fallback, batching without offset skips, error propagation, no-progress detection, and shared course-asset exclusion are tested. API failure stops deletion rather than returning a false success. This is local implementation, not deployed or tested against a real account deletion. Storage operations are not transactional; interrupted cleanup can remove some uploads while leaving the account available for retry. Concurrent uploads and staff-owned shared assets still require staging/retention review.
5. **Android instrumentation retains Capacitor placeholder package assertion.** Corrected to the actual Vault application ID. The identity smoke test passed on Android 16; it is not end-to-end coverage by itself.

## Connected Lovable inventory — follow-up

- Lovable reported all 46 retained AI gateway requests in the last seven days failed with HTTP 403 `credit_hard_block_workspace`, with zero successes. Managed `LOVABLE_API_KEY` exists; no independent AI provider key was listed. A workspace administrator must clear the credit/spending block; redeploying Atlas cannot resolve it. No billing changes were made.
- Preview and published app share one live backend; no separate staging target was found. The unrelated Appliance House project must not be used as staging.
- No Android `google-services.json` was found. APNS secret names exist, but delivery is unverified.
- Content/history review again found 26 visible lessons without supplied video links. Unmatched community videos were not substituted.
- Despite the no-edit request, Lovable plan mode wrote `.lovable/plan.md`. No remote application implementation, database changes or plan execution were approved.

## Additional local permissions fix

Added `20260917060000_member_messaging_ban_guard.sql`: banned profiles cannot regain member-contact eligibility through active subscriptions or staff roles. Isolated PostgreSQL tests pass for banned sender/recipient rejection, discovery, friend requests and uploads, including a banned operator. Existing history retention is unchanged. This migration is not deployed.

## Backend and content gates requiring decisions/access

- Confirm the isolated staging Supabase target before executing member messaging/Atlas/storage migrations or destructive account tests. Connected live project remains `3f554d41-bb0c-4e4a-ac27-d63167a6e1a4` / Supabase `oemylhcjqncovnmvvgxh`; read-only checks confirmed storage owner columns and available buckets.
- Provision the Atlas provider secret securely on the selected backend, then run actual answer-quality and entitlement evaluations. Do not put keys in frontend variables or source files.
- Supply the correct missing lesson videos, or approve excluding the 26 unfinished lessons from launch. Do not invent URLs or silently substitute unrelated videos.
- Configure Android Firebase and iOS APNs, verify actual delivery and tap routing.
- Complete signed Release/TestFlight/Play testing, real purchase/restore/refund checks, privacy/moderation requirements, and multi-user live messaging/reconnect tests.

## Evidence and testing scope

- Isolated PostgreSQL/PGlite messaging tests passed plus new service-only storage ownership/permissions/batch tests: `/tmp/vault-functional-db-tests.log`.
- Android native build, scoped app unit tests, and instrumentation build succeeded. An initial unscoped Gradle command also tried building Capacitor library instrumentation and encountered duplicate Kotlin dependencies in that generated module; app-scoped tasks passed. This is not claimed as a clean all-module build.
- Emulator used existing Vault AVD in read-only/no-save mode on port 5580, not the unrelated Pasco AVD. Only its ephemeral Vault app data was cleared for clean-install verification.
- Initial native crash evidence: Android logcat 13:57:16, PID 6735. Fixed process PID 7227 survived authenticated navigation.
- Native WebView automation script: `scripts/qa-android-webview.cjs`; credentials supplied through environment only. No messages, purchases, reset emails, or account deletions submitted.
- Passing Android navigation log: `/tmp/vault-android-fixed.log`; screenshots `/tmp/vault-android-fixed/`.
- Keyboard failure screenshot: `/tmp/vault-android-chat-keyboard.png`.
- Keyboard fix verified on the rebuilt Android app: `/tmp/vault-android-chat-keyboard-fixed.png` shows the complete composer above the actual software keyboard. DOM bounds also fit within the visible viewport. Dismissing the keyboard restored the full 914px viewport and tapping Home succeeded.
- Latest full unit run: **370 tests / 60 files passed**, `/tmp/vault-keyboard-final-tests.log`. TypeScript and diff whitespace checks passed. Web build and Android app Debug build passed; existing bundle-size/Gradle deprecation warnings remain.
- Rebuilt and synced the final shared viewport code to iOS. iPhone 13 mini authenticated navigation regression passed: `/tmp/vault-functional-ios-regression.xcresult`. This does not certify every iOS keyboard or device version.
- Storage cleanup follows the [Supabase Storage deletion API](https://supabase.com/docs/guides/storage/management/delete-objects) and [ownership fields](https://supabase.com/docs/guides/storage/security/ownership); SQL only inventories objects and does not delete blob metadata directly.
