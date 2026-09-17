# Native iOS journey coverage matrix — 2026-09-17

Read-only XCTest journeys added to the existing `VaultOSLaunchAuditTests` class
(new file `ios/App/VaultOSPurchaseUITests/VaultOSJourneyAuditTests.swift`, same
`VaultOSPurchaseUITests` target). The purchase suite is untouched.

These tests have NOT been executed in the Lovable environment — no simulator is
available here. They compile-target iOS XCTest and are intended to be run
locally on a real simulator.

## Selectors to run

```
-only-testing:VaultOSPurchaseUITests/VaultOSLaunchAuditTests/testJourneyCommunityTabs
-only-testing:VaultOSPurchaseUITests/VaultOSLaunchAuditTests/testJourneyMessagesSearchAndDismiss
-only-testing:VaultOSPurchaseUITests/VaultOSLaunchAuditTests/testJourneyLearnChapterAndLesson
-only-testing:VaultOSPurchaseUITests/VaultOSLaunchAuditTests/testJourneySettingsSectionsReadOnly
-only-testing:VaultOSPurchaseUITests/VaultOSLaunchAuditTests/testJourneyCoachAndSupportPanels
```

Environment (test accounts only): `VAULT_AUDIT_EMAIL`, `VAULT_AUDIT_PASSWORD`.
When a cached session already exists these are unused. When the app is signed
out and they are unset, the journey **skips** rather than reporting a pass.

## Asserted (real UI, adaptive waits, screenshots attached)

| Journey | Asserted |
| --- | --- |
| Community tabs | Signed-in nav loads; Signals tab exists and renders EITHER the room or the upgrade gate; Wins tab exists and opens; returning to the Chat room tab restores the tab bar (top-most "Chat" match, distinct from the bottom tab bar) |
| Messages | `Messages` opens the inbox; `New message` opens member search; typing yields results or a notice; `Close member search` dismisses; no compose, no send |
| Learn | A chapter card (`Start…`/`Continue…`/`Review…`) opens the curriculum; a lesson row opens the player (`Back to lessons` present); back returns to the lesson list |
| Settings | Section navigation loads (desktop list or `Settings page` dropdown); `Social links` plus Instagram and YouTube fields are present; Account, Password & security, Notifications, Trading preferences, Privacy & data, Help & support each open; exit via the app's own back control |
| Coach / support | `Ask Coach` opens the coach panel; the human-coach tab switches; `Close coach` closes it; `Schedule 1:1` renders and returns Home |

Screenshot checkpoints: `20`–`23` community, `30`–`32` messages, `40`–`43`
learn, `50`–`53` settings, `60`–`63` coach/support.

## Not asserted / unknown

- **Video playback.** Only the player's presence and back control are asserted;
  actual frames, audio, and the 26 empty lesson links are not verified.
- **Message delivery.** Nothing is sent, so realtime delivery, attachments,
  private-storage reads, blocks and bans are unverified natively (covered only
  by unit tests and backend policy).
- **Settings persistence.** No Save is tapped; write paths, billing portal,
  membership changes and account deletion are deliberately untested.
- **AI answers.** The coach panel opens, but the workspace AI credit block means
  no live answer can be asserted; Atlas is off (`VITE_ATLAS_ENABLED` unset).
- **Signals entitlement correctness.** The test accepts room OR gate; which one
  is correct depends on the account tier and is not asserted here.
- **Push notifications, purchases, restore, sign-up, password reset by email.**
- **Android.** Owner-run WebView audit, out of scope for this file.
- **Basic/guest bottom-nav variant** (Menu/Learn/Bootcamp/Chat) is not
  separately exercised; the journeys assume the standard signed-in tab bar.

## Safety guarantees in the test code

No send, upload, save, purchase, restore, membership change, account deletion,
publish, or backend/data edit. Sign-in flow unchanged; only navigation, reading,
and dismissal.
