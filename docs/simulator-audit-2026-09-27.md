# Simulator audit - September 27, 2026

## Scope and release status

Tested the local working tree using a production Vite bundle inside native Debug
builds, not the localhost preview. iOS app version 1.0.8 (54); Android 1.0.8 (55).
Nothing was published or deployed. This is simulator verification, not release
approval, real-device performance certification, or proof of live billing access.

All 18 distinct installed iPhone/iPad hardware profiles were exercised on the only
installed iOS runtime, 26.3.1 (23D8133). Duplicate named QA devices were not treated
as additional hardware coverage. Older supported OS versions remain untested.

## Fixes made during testing

- The native login container retained its full viewport height when the keyboard
  opened, placing the password behind it on iPhone 13 mini. Entry containers now
  use the existing native visible-height variable; the login introduction becomes
  compact while typing. The failing input test passed after this change.
- The shared native safe-area rule removed horizontal padding from entry screens.
  A scoped entry rule restores 24px minimum gutters without changing dashboard
  layouts. The final launch test includes button-gutter assertions.
- Updated native test selectors for the current Log in link, added launch and
  free/paid entry navigation checks, and added bounded rotation waits.
- Added three source-level keyboard/gutter safeguards and an Android instrumented
  render check. Tests do not create accounts, submit purchases, send messages,
  request password-reset emails, or modify memberships.

## Verified results

| Check | Result | Coverage |
| --- | --- | --- |
| Final iOS launch and welcome gutters | 18/18 passed, no skips | Every installed unique iPhone/iPad profile |
| Entry navigation and keyboard/recovery/rotation | 6/6 executions passed | Two tests on iPhone 13 mini, iPhone 17 Pro Max, iPad mini A17 Pro |
| Final entry-flow recheck after gutter fix | 1/1 passed | iPhone 17 Pro Max, Free/Full account forms and return to login |
| Member-only journeys | 6 skipped, not passes | No authenticated simulator session or supplied test credentials |
| Android native WebView render | 1/1 passed | VaultOS_Play_Billing AVD, Android 16/API 36 |
| Frontend regression suite | 570/570 passed | 89 test files |
| Local entitlement/RLS suite | Passed | 108 matrix assertions plus read/write, anonymous, notification and helper-permission checks |
| Builds | Passed | Vite, iOS build-for-testing, Android Debug app and app instrumentation APK |
| Static checks | Passed | TypeScript, scoped ESLint, git diff whitespace checks |

The deeper iOS funnel matrix was run after the keyboard fix. The final 18-device
launch matrix was rerun after the gutter fix. Native test execution time includes
XCTest/host overhead and must not be presented as a real-device launch benchmark.

### iOS hardware coverage

- iPhone 11, 13, 13 mini, 14 Pro, 15, 15 Pro, 16 Pro Max, 16e.
- iPhone 17, 17 Pro, 17 Pro Max, Air.
- iPad A16, mini A17 Pro, Air 11-inch M3, Air 13-inch M3.
- iPad Pro 11-inch M5, Pro 13-inch M5.

### Android environment

The initial concurrent emulator attempt encountered host memory pressure and an
Android System UI ANR. It was not counted as a pass. A cold, headless restart after
the iOS matrix completed ran the native render assertion successfully (JUnit
reported OK, one test, 5.706 seconds). The emulator started for this audit was then
stopped. Existing iOS simulator data was preserved; unrelated emulators were not
used.

Use `:app:assembleDebugAndroidTest`, not the root-wide task. The latter also tries
to build upstream Capacitor/Cordova plugin test APKs and encountered conflicting
Kotlin stdlib versions in a plugin's own tests. The application test APK builds
and runs successfully without changing production dependencies.

## Still required before release

1. Sign in dedicated free, whitelisted, active Stripe and active Apple test
   accounts, then run member journeys and check channel authorization in the app.
   The attempted suite skipped Community, Learn, messages, settings, coach/support
   and repeated authenticated startup. It did not certify those screens.
2. Deploy and verify the pending entitlement migration and coordinated backend
   functions. Local policy tests are not evidence that production has those rules.
   See `membership-access-policy-2026-09-27.md` for the deployment dependency.
3. Verify Stripe checkout/webhook/return and Apple sandbox purchase/restore with
   real verified provider responses, including cancellation and expiry. No charge
   was made in this audit.
4. Test APNs/FCM delivery, notification opening, live-room availability, realtime
   chat across two accounts and keyboard/GIF behavior inside authenticated chat.
5. Test supported older OS versions and physical iPhone/iPad hardware. Review
   remaining Vite chunk-size warnings and the native UIScene lifecycle warning.

## Evidence

Local Xcode result bundles and exported screenshots:

- `/tmp/vault-sep27-small.xcresult`: initial keyboard failure.
- `/tmp/vault-sep27-small-fixed.xcresult`: three small-phone checks passed.
- `/tmp/vault-sep27-device-matrix.xcresult`: initial 18-device launch pass.
- `/tmp/vault-sep27-funnel-matrix.xcresult`: six deeper public-flow executions.
- `/tmp/vault-sep27-member-journeys.xcresult`: six explicit member-test skips.
- `/tmp/vault-sep27-final-device-matrix.xcresult`: final 18-device launch/gutter pass.
- `/tmp/vault-sep27-final-entry.xcresult`: final signup/login navigation recheck.
- `/tmp/vault-sep27-final-device-matrix-attachments/`: final launch screenshots and
  a manifest associating each image with its device.
- `/tmp/vault-sep27-funnel-matrix-attachments/`: login, signup, keyboard, recovery
  and rotation screenshots.

Native test sources are in `ios/App/VaultOSPurchaseUITests/` and
`android/app/src/androidTest/java/com/vaulttradingacademy/vaultos/VaultLaunchSmokeTest.java`.
Android render test command:

```sh
adb -s emulator-5580 shell am instrument -w \
  -e class com.vaulttradingacademy.vaultos.VaultLaunchSmokeTest \
  com.vaulttradingacademy.vaultos.test/androidx.test.runner.AndroidJUnitRunner
```
