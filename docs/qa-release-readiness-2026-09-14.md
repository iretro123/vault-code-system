# Vault OS — local QA and release readiness

September 14, 2026. Three parallel agents plus primary browser/testing work. **Status: improved locally, not yet cleared for production release.** No production writes, deployment, purchases, notifications or messages were sent.

## Executed checks

| Check | Result |
| --- | --- |
| Final combined Vitest run, 23:20 ET | **281 tests passed across 40 files**, zero failures |
| App and Node/config TypeScript | Pass (app rerun after final fixes) |
| Final production build | Pass, 4.79 seconds; bundle-size warnings remain |
| Chromium responsive matrix | 60 combinations: 10 routes × 6 viewports (320–1440px wide) |
| WebKit responsive matrix | 40 combinations: 10 routes × 4 viewports including landscape |
| Layout results | No uncaught page errors, document horizontal overflow, or measured visible main-area text/control horizontal clipping in these 100 combinations |
| Chromium interaction rerun | 60 combinations; 18 interactive cases passed across all six sizes |
| WebKit below-fold rerun | 40 combinations; eligible scroll containers reached bottom |

Routes: Home, Live, Learn, Trading Setup, Trade OS, Schedule 1:1, Settings Profile/Trading/Help, Community. Interactive checks opened/closed both classrooms, verified Wednesday invite availability, switched all four community tabs, typed/cleared a long draft without sending, and checked $1,000 × 1% = $10 plus account-type reset. Small-screen classroom modal was visually inspected after its animation settled. Representative top/bottom screenshots inspected for mobile and desktop, including booking CTA, setup footer, landscape chat and profile.

**Browser matrices use a synthetic member with intercepted backend responses and empty course/message collections.** They validate responsive shells, empty states and selected interactions—not successful real uploads, rich conversation density, course playback or PDFs. A separate read-only accessibility inspection of the user's populated local Community page identified message/avatar/menu labels that were fixed. Chromium widths named after phones are not Android/iOS OS testing. Playwright WebKit is not a physical Safari/iPhone certification. No Lighthouse score or real-device performance score was measured.

## Fixed in this pass

- Attachment uploads now use the local read-only guard; localhost production-build previews are protected too.
- Failed signal/recap sends retain their drafts instead of clearing the form.
- Playbook checks persistence errors, isolates reading cache by user, ignores stale-user results, and keeps preview progress local. Checkpoint success depends on a successful save.
- Notification preference controls wait for successful saves and report failure; saves are serialized.
- Native keyboard dependency is now bundled instead of left as an unresolved import. Three regression tests cover loading, horizontal gesture handling and rotation state.
- Removed global native horizontal gesture/overflow suppression so intentional scrolling controls can work. Root overflow containment remains.
- Viewport width changes reset keyboard detection; shrinking the viewport without editing no longer automatically hides navigation.
- Named navigation, inbox-close, profile-cancel, message-menu and avatar controls for assistive technology. The setup checkbox already had a valid wrapping label.
- External-link handling no longer mistakes an isolated null window handle for failure and navigates the current app away.
- Corrected misleading Preferences/Keychain documentation; no secure-storage migration has been performed.
- Fixed TypeScript payload/test errors, QueryClient test setup and malformed Atlas provider response handling.

## Release gates still open

1. **Production feature parity:** Live, Trade OS, Setup and parts of Learn use local/development routing gates. The hosted/native release can still show older or missing screens. Wire production-ready versions deliberately; do not remove preview safety guards indiscriminately.
2. **Production stock-watch backend:** `/api/stocks-to-watch` exists in Vite development middleware, not in packaged native assets. Deploy/configure a backend and test its failure/stale states before claiming release support.
3. **Real devices and staging:** Signed iOS/Android builds, notches/safe areas, real keyboard open/dismiss/rotation, text scaling, camera/file pickers, push grant/deny/background tap, login/logout/cold restart, Zoom return, sandbox purchase/restore, PDF/video playback and flaky/offline networks remain untested. Use isolated test accounts/backend. LAN-address previews and native localhost are not protected by the local-web read-only guard.
4. **Performance:** Largest minified chunks: RoomChat ~1.68MB (231KB gzip), App ~724KB (221KB gzip), legacy Trade ~539KB (149KB gzip). Profile network/CPU cost on lower-end hardware and split heavy optional features. A successful build is not a performance certification.
5. **Lint and lifecycle/security review:** Baseline audit found 12 lint errors and 95 warnings, including dependency warnings; final lint has not been rerun after all fixes. Room-message cache account lifecycle, native notification onboarding wiring and secure token storage/backup policies remain review items. Unit tests do not prove production RLS or cross-account authorization.

## Reproducible evidence

- `scripts/qa-device-matrix.cjs` (QA_FLOWS=1 enables interactions; QA_DEVICE/QA_ROUTE filter; QA_OUT selects artifact directory).
- `scripts/qa-webkit-matrix.cjs`, `scripts/qa-webkit-bottom.cjs`.
- Chromium artifacts: `/tmp/vault-device-qa`, `/tmp/vault-device-qa-flows`, `/tmp/vault-device-qa-modal`.
- WebKit artifacts: `/tmp/vault-webkit-qa`, `/tmp/vault-webkit-bottom-qa`.
- Supporting reports: `qa-automated-2026-09-14.md`, `qa-interactions-2026-09-14.md`, `qa-native-release-2026-09-14.md`, `qa-webkit-2026-09-14.md`.

Temporary screenshots/results may be cleared by the OS. Scripts remain in the repository. Tests ran against the working local app while fixes landed, not a frozen signed release candidate. The final combined suite and build ran after fixes. These findings reduce known defects; they do not establish zero issues or every-device compatibility.
