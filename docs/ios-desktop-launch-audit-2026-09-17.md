# Desktop, mobile, and native iOS launch audit — September 17, 2026

## Release decision: NO-GO

### Follow-up: verified live release blockers

Read-only database inspection on September 17 used the connected Vault Lovable project `3f554d41-bb0c-4e4a-ac27-d63167a6e1a4`. No production rows, schema, or accounts were changed.

- **Member messaging is not deployed:** `information_schema.tables` has no `member_*` tables. `pg_proc` has none of `open_member_conversation`, `send_member_message`, `discover_message_members`, `search_message_members`, or `list_member_friends`. Local DM/friends tests cannot substitute for deploying and staging-testing the three messaging migrations.
- **Atlas foundation is not deployed:** no `atlas_*` tables or `consume_atlas_request` function were found. Keep the new Atlas backend disabled until its documented activation gates pass.
- **Missing course content:** 76 visible lessons, of which **27 have an empty/missing video URL**. Of those, 26 have zero notes and one has only two characters. These are not complete text lessons. All 49 nonempty video URLs use HTTPS, which does not prove actual playback. Missing-video counts: chapter 5: 2; chapter 6: 10; chapter 7: 11; chapter 8: 1; rulebook workshop: 2; trading psychology: 1. Content owner must provide the videos or approve excluding unfinished lessons from launch. Nothing was hidden or deleted.
- **Local compatibility fix:** replaced regex lookbehind in chat sanitization with code-point iteration, retaining emoji/international text and removing NUL/lone surrogates. Added three regression tests. This removes that syntax dependency; it does not certify every supported older iOS version.
- **Latest checks:** 343 tests passed across 56 files; TypeScript, production build and diff whitespace checks passed. The WebKit fixture run completed 40 cases with zero layout-boundary failures; one tablet Support case reported intercepted-backend CORS errors. Added explicit CORS response headers to the test fixture and a targeted device/route option; isolated tablet Support rerun passed. Preserve the original failure as evidence, not a claim of 40 clean initial cases.
- **Remaining tooling warning:** ESLint still reports preexisting test typing and small production lint issues; the build also warns about large bundles. Neither has been relabeled as clean.

Evidence: `/tmp/vault-release-followup-tests.log`, `/tmp/vault-release-followup-build.log`, `/tmp/vault-release-webkit.log`, `/tmp/vault-webkit-support-recheck/results.json`.

**Next approval needed:** select a staging backend for messaging/Atlas rollout and isolated multi-user/deletion tests, and decide whether to supply the missing videos or exclude unfinished lessons. Production deployment, real purchases, and deletion of an existing account are not performed by this audit.

Preview/release design differences were found and corrected locally for the principal redesigned routes. Native authenticated navigation now passes; release certification still requires the live-service and physical-device checks below. No App Store upload or submission was performed.

## New checks performed

- Built the real Capacitor iOS project with Xcode 26.3 for iOS Simulator after regenerating its missing bundled web assets using `cap sync ios`. Native Debug build succeeded. This used the production web bundle, not the Vite preview server; it is not a signed Release archive or TestFlight build.
- Created dedicated iPhone 17 Pro and iPhone 13 mini simulator devices using iOS 26.3. Installed and launched the native app. Captured native screenshots and XCTest result bundles.
- Added `VaultOSLaunchAuditTests` to the existing UI-test target. The signed-out test exercises welcome → sign-in, text entry, orientation, relaunch, and password-recovery return. A separate authenticated test uses user-supplied credentials injected through the test environment. Neither creates accounts, submits resets, sends messages, or buys products.
- Updated native signed-out smoke test passed on iPhone 13 mini. The focused-field screenshot now fits horizontally after the font/padding fix. Simulator hardware-keyboard input was used; software-keyboard behavior is not certified. The orientation screenshot caught a transition, so stable landscape layout remains unverified.
- Authenticated native navigation passed after correcting the XCTest Live-link selector (`Live` accessibility label versus `Vault Live` visible text). Home, Chat, Learn, drawer, Live and return-to-Home were exercised. Native screenshots confirm the redesigned dashboard is bundled; this is not a full end-to-end validation of every screen action.
- Final full unit/component suite: **340 tests passed across 55 files**. TypeScript no-emit check and production Vite build passed (bundle-size warnings remain).
- Fresh desktop browser run: **24 routes passed** the configured navigation, scrolling, flow, clipping, and page-exception checks at 1440×900.
- Fresh small-mobile browser run: **24 routes passed** at 320×568 using the same checks.
- Fresh populated Community run: **42 cases passed** across Chromium/WebKit and seven viewport sizes (Chat, Signals, Wins). These are synthetic, intercepted-backend fixtures, not proof of live delivery.
- Re-ran 31 targeted tests covering native viewport behavior, back navigation, preview upload safety, chat permissions, and DM transport: all passed.
- Re-ran the isolated SQL messaging harness: two-way messaging, friend request ownership, private search/file access, spoof protection, GIF allowlist, deduplication, read markers, blocking, rate limits, and anonymous/shared-guest denial passed. This uses local PGlite, not the deployed database.
- Prior 338-test full suite, 144-case Chromium and 40-case WebKit results are documented separately in `qa-release-audit-2026-09-17.md`.

## Critical findings

### 1. Editable profile data affects the access gate

`src/lib/appReview.ts` returns true when email, username, or display name contains `appreview`. `src/hooks/useStudentAccess.ts` then returns active access and an admin-bypass flag. A read-only synthetic reproduction returned false for an ordinary profile and true when only its display name contained that marker.

This is a **client entitlement-gate weakness**, not proof that backend RLS or payments can be bypassed. Fixed locally: removed review-name recognition from `useStudentAccess`, and scoped fallback entitlement caches by user ID so a different account cannot inherit the previous account’s cached access. Added regression tests. Review accounts must receive server-controlled membership like other accounts; free/expired/paid/admin isolation still needs staging verification.

### 2. Test credentials exist in tracked Swift source

The existing purchase test suite included hard-coded account passwords. Values are intentionally omitted from this report. Removed local source defaults in favor of test-environment injection. Rotate affected credentials if still valid and review repository history/exposure; removing source text is not credential rotation. Existing purchase tests were not run.

### 3. Required Preferences privacy declaration is absent from the inspected app bundle

The project uses Capacitor Preferences (UserDefaults). The initial app bundle lacked an app-level UserDefaults declaration. Added `PrivacyInfo.xcprivacy` with reason `CA92.1` for app-only storage, registered it in Xcode resources, validated its plist, and confirmed it in the rebuilt simulator app bundle. This does not complete the full SDK/data-collection privacy inventory or Release archive validation.

Reference: https://capacitorjs.com/docs/apis/preferences#apple-privacy-manifest-requirements

### 4. Preview and release designs differ

Home, Live, Support, Trade, and Setup had local/DEV-only design wiring. Updated these release routes to the redesigned components; Learn also uses the cleaned lesson labels and illustrative chart classroom. Live preserves its membership gate and existing administrator session editor. Preview write protections remain enabled. Hid the unavailable introduction-video placeholder and replaced local-preview wording in the missing-room-link state. Production build succeeds and native screenshots confirm the redesigned dashboard. This does not imply that every backend integration is deployed/configured.

### 5. Account-deletion storage cleanup needs verification

The deletion function handles older chat tables and deletes the auth account. The new member tables have cascading foreign keys, but the function has no storage-object removal path for private DM uploads. Database cascades alone do not prove uploaded files are removed; auth deletion may also fail for storage owners. Test this with a staging account owning uploaded files and verify storage cleanup/retention explicitly.

Apple requires in-app account deletion where account creation is supported: https://developer.apple.com/support/offering-account-deletion-in-your-app

### 6. Native sign-in layout/keyboard needs further work

A native screenshot showed a zoomed/clipped sign-in form. Fixed mobile auth input size to 16px and explicit horizontal safe-area padding, without disabling accessibility zoom. The updated iPhone 13 mini focused-field screenshot fits. Physical-device software-keyboard and older iOS checks remain open.

### 7. Native session testing needs isolation

The initial iPhone 17 Pro signed-out XCTest encountered an authenticated dashboard rather than the expected sign-in form and failed. The cause of that session state was not established; no conclusion of an authentication leak is warranted. The second simulator started on Welcome; selectors were corrected to follow the actual welcome button. A later authenticated test passed login and tab navigation but failed on its Live-link selector; correcting the selector produced a passing run. No purchase, message-send, or deletion flow was exercised. Raw failures are retained.

### 8. Native banner/composer interaction

Native screenshot review found the notification opt-in banner added above a full-height Community panel, pushing its composer below the fixed navigation. Changed Community’s parent to a bounded flex column: banners retain their natural height and chat receives only the remaining space. The final native navigation test passed; its Chat screenshot now shows the complete textarea, attachment/emoji/GIF controls and send button above navigation. The 320px browser Community recheck also passed. Software-keyboard opening remains a separate unverified case.

## Design judgment

The inspected desktop Community layout is consistent: aligned sidebar, restrained blue selected tabs, readable content, and a composer inside the chat panel. The small native welcome and corrected sign-in screens fit. Release routing now points to the newer designs, with the dashboard verified in the authenticated native run. Browser fixtures are not a substitute for live conversations, large attachments, or every lesson.

## Evidence locations

- Native build log: `/tmp/vault-ios-launch-build.log`
- Initial native failure: `/tmp/vault-ios-launch-smoke.xcresult`
- Small-screen initial run: `/tmp/vault-ios-small-smoke.xcresult`
- Native screenshots: `/tmp/vault-ios-launch-initial.png`, `/tmp/vault-ios-small-launched.png`
- Desktop results/screenshots: `/tmp/vault-desktop-launch-sept17/`
- Small browser results/screenshots: `/tmp/vault-small-launch-sept17/`
- Populated Community matrix: `/tmp/vault-community-type/`
- Updated native passing smoke: `/tmp/vault-ios-updated-smoke.xcresult`
- Updated focused sign-in screenshot: `/tmp/vault-ios-updated-evidence/9FF216C7-D8BD-4F2B-B29D-D10FD30D2401.png`
- Initial authenticated navigation failure: `/tmp/vault-ios-authenticated.xcresult` (ended on Welcome; cause not established)
- Passing authenticated navigation: `/tmp/vault-ios-final-auth.xcresult`
- Post-routing browser reruns: `/tmp/vault-final-desktop-sept17/`, `/tmp/vault-final-small-sept17/`
- Both post-routing browser reruns completed 24 routes each with no recorded overflow, clipping, page errors or failed configured interactions.
- Final native composer/navigation test: `/tmp/vault-ios-composer-auth.xcresult`
- Corrected native chat screenshot: `/tmp/vault-ios-composer-evidence/BFF00055-B8EB-4C28-875E-8D84919C4A3C.png`

## Not certified by this audit

Real APNs delivery/background taps, actual purchases/restores/refunds, live two-member messaging/reconnects, every private lesson video's playback/seek/fullscreen, photo/file permissions, real-device keyboard behavior, older supported iOS releases, VoiceOver/Dynamic Type, memory leaks under prolonged use, production RLS/security penetration testing, and App Store Connect metadata/signing. A staging backend with isolated test accounts and a physical-device/TestFlight pass are needed for those gates.

Apple's review checklist also requires complete functionality, working backend access for review, accurate privacy information, and appropriate user-content moderation. Reference: https://developer.apple.com/app-store/review/guidelines/
