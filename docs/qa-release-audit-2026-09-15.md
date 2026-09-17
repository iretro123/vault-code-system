# Vault OS release audit — September 15

Status: local fixes verified in part; **not cleared for launch**. No production changes, messages, purchases, uploads or deployments.

## Executed

- 302 unit/component tests passed across 44 files after video URL fixes.
- Chromium: 60 cases across 10 routes and six viewport sizes, plus 18 interaction checks. No measured horizontal clipping, document overflow or uncaught errors.
- WebKit: 40 cases across those routes and four sizes including landscape; no reported clipping, overflow or uncaught errors.
- Screenshots visually inspected: 320px Community and desktop Learn. The latter deliberately has empty course data in this fixture.
- Production build passes; large chunks and ambiguous Tailwind-duration warnings remain.
- TypeScript identified invalid `exact` options in two emoji tests; corrected.
- ESLint found 18 errors before cleanup. Removed the Playbook constant-false debug block; remaining lint issues need resolution, including backend and test files.

Matrices use synthetic member data and intercepted backend responses. They do not test actual devices, populated lesson libraries, permissions, payments or real hosted media playback. Temporary artifacts: `/tmp/vault-release-sept15` and `/tmp/vault-webkit-qa`.

## Fixed locally

- Recognize YouTube Live, mobile, privacy-enhanced embed and query-parameter variants using host-aware parsing.
- Preserve private Vimeo URL hashes instead of stripping required access information.
- Reject non-HTTPS embed URLs and avoid matching fake YouTube host names.
- Unsupported dashboard inline-video formats now navigate to the exact lesson instead of leaving Watch unresponsive.
- Name dashboard video iframe and close control for accessibility.
- Correct provider-independent lesson fallback wording.
- Remove unused Playbook debug markup; correct emoji test types.

## Design and pipeline gaps preventing launch

1. **Design parity:** `AcademyHomeRoute`, `AcademyLive`, `AcademySupport`, and the Trade route choose redesigned screens only for DEV localhost. Setup route is DEV-only. Learn also gates some features locally. A production bundle can show the old dashboard/Live/Support/Trade and omit Setup. Do not simply remove guards: local preview components and persistence must be reviewed for authenticated production behavior first.
2. **Atlas:** production uses `VITE_ATLAS_ENABLED` and `atlas-chat`; local uses `/__atlas`. Removing a status label does not configure a model. Validate real authenticated answers, timeout/failure behavior, usage controls and cost limits in staging.
3. **Stock watch:** frontend depends on `/api/stocks-to-watch`, implemented by Vite development middleware. Need a hosted backend route and freshness/failure verification for production/native.
4. **Video content:** parser tests are not evidence that every private, deleted, regional or embed-disabled lesson plays. Inventory every authenticated lesson source and exercise actual playback/seek/fullscreen in staging and real devices. Schedule 1:1 intentionally has a placeholder unless `VITE_VAULT_TRAINING_INTRO_URL` is supplied.
5. **Media and memberships:** real PDF permissions, uploads, chat delivery/reconnection, role gating, purchase/restore, notification permission/background taps and cross-user access require isolated staging accounts and backend validation. The local guard intentionally blocks writes.
6. **Bundle/lint:** RoomChat remains about 1.68MB minified, App about 724KB, legacy Trade about 539KB. No CPU/network performance certification. Lint is not clean.
7. **Real devices:** browser viewport emulation and WebKit are not a signed iOS/Android test. Verify keyboards, safe areas, background/resume, Zoom return, poor networks and accessibility text scaling.

## Safe next phase

Provision or designate a separate staging backend and release candidate. Port approved V2 screens to shared production-ready components, keep preview write guards independent of visual routing, then run populated-content and two-account end-to-end checks. Only after those gates pass should production deployment be authorized.
