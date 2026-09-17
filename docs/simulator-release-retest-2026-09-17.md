# Current-build simulator release retest — September 17, 2026

Release decision: **NOT READY for unconditional launch sign-off.** This is a bounded test pass, not certification of all devices, operating systems, integrations, or absence of bugs.

## Build and automated checks

- Rebuilt the current web bundle and synced it into the Capacitor iOS app. Native simulator Debug build succeeded. This is not a signed Release archive or TestFlight submission.
- TypeScript check passed. Full unit suite: 353 tests across 57 files passed before the toast adjustment.
- Chromium responsive matrix: 60 route/device cases, no recorded horizontal overflow, clipped inspected elements, or JavaScript errors.
- WebKit responsive matrix: 40 route/device cases, no recorded horizontal overflow, clipped inspected elements, or JavaScript errors.
- Browser matrices use synthetic members and intercepted backend responses. They are layout checks, not live service certification. Chromium sizes include 320px, 375px, 393px, 412px, 768px, and 1440px widths; WebKit includes portrait phones, tablet, and landscape.

## Native results and actual defect found

Only iOS 26.3.1 (23D8133) is installed. Dedicated iPhone 13 mini, iPhone 17 Pro Max, and iPad mini (A17 Pro) simulators were used.

- Signed-out sign-in/input/rotation/recovery flow: small iPhone and iPad passed first run. Large iPhone failed to locate Email after relaunch, then passed an isolated rerun. The intermittent first-run failure is retained, not erased from the verdict.
- Authenticated navigation: iPhone 13 mini passed Home → Chat → Learn → Home → Menu → Live → Home.
- iPad authenticated navigation failed when the welcome toast covered Home. Screenshot and XCTest failure confirmed the bottom notification overlapped the mobile navigation at the tablet's 744px portrait width.
- Adjusted the shared Radix toast viewport to clear the 72px mobile navigation plus bottom safe area below the desktop breakpoint. Empty viewport space no longer intercepts pointer events; actual toast controls remain interactive. Desktop bottom-right placement is retained, and phone top placement respects its safe area.
- Post-fix iPad authenticated navigation passed on both the existing test simulator and a new fresh-install iPad simulator, including actual sign-in and return to Home. The full 353-test unit suite also passed again after the change.

The rotation test captures immediately after changing orientation, so a transitional screenshot is not proof of a stable landscape layout. Software keyboard was not visible in inspected input screenshots; physical/software keyboard occlusion remains unverified.

## Remaining release gates

- Previously verified live backend lacks the new member messaging and Atlas tables/functions. Local implementation is not production deployment.
- Latest lesson audit: 50 linked videos started playback; 26 visible lessons still lack video URLs. This supersedes the earlier 49/27 count in the first launch audit.
- Real multi-user delivery/reconnect, purchases/restores/refunds, push delivery, account deletion, physical-device permissions/keyboards, older iOS versions, accessibility, prolonged memory testing, and signed Release/TestFlight testing are not certified.
- Android SDK and two AVDs are installed, but this pass does not claim native Android execution. Android-width Chrome layout testing is not equivalent to an Android emulator test.
- No app-store submission, production deployment, purchase, or member message was performed by this pass.

## Evidence

- `/tmp/vault-ios-release-current-smoke.xcresult`
- `/tmp/vault-ios-release-large-retry.xcresult`
- `/tmp/vault-ios-release-current-auth.xcresult`
- `/tmp/vault-current-auth-images/852BCCD1-6714-489A-96CC-5BE43EDD396D.png` — iPad toast obstructing navigation
- `/tmp/vault-release-current-browser/results.json`
- `/tmp/vault-release-current-webkit/results.json`
- `/tmp/vault-sim-release-unit.log`
- `/tmp/vault-sim-release-types.log`
- `/tmp/vault-ios-tablet-toast-fix.xcresult`
- `/tmp/vault-ios-fresh-tablet-toast.xcresult`
- `/tmp/vault-release-post-toast-tests.log`
