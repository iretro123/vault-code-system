# Design and release follow-up audit

Read-only application audit; no application edits or deployment. Restarted the stopped localhost Vite preview on port 4175 to unblock browser testing.

## Fresh checks

- 302 tests passed across 44 files.
- App TypeScript passed.
- Production build passed, with large-chunk and ambiguous-duration warnings.
- ESLint: 17 errors remain; a passing build does not mean lint or production readiness is clear.
- Expanded 320px navigation run: main sections plus Bootcamp, Resources, onboarding Profile, My Questions, Journal, Progress, Playbook, nonexistent course/room fallback and additional Settings sections. Uses synthetic member data and intercepted backend requests, not real member content.
- Visually inspected Resources, My Questions and Profile screenshots. Artifacts: `/tmp/vault-audit-navigation-current`.

## Confirmed old-design / unfinished areas

| Area | Evidence | Required follow-up |
| --- | --- | --- |
| Home, Live, Support, Trade | DEV/localhost conditions select upgraded screens; release selects older components | Port the approved UI without blindly removing preview safety or persistence checks |
| Trading Setup | DEV-only route, plus local-only component guard | Establish production routing and authenticated behavior |
| Resources / Toolkit | Legacy Vault Approval form with dense controls; static templates and PDF cards say Coming soon | Consolidate with approved Trading Setup/Trade OS; remove or complete unavailable offerings |
| My Questions | Small filter pills, dim empty-state copy; query errors ignored by loadTickets | Match newer sizing/contrast and add visible load failure/retry behavior |
| Profile onboarding | Separate welcome/banner-upload presentation from the newer settings flow | Harmonize onboarding and profile editing while retaining onboarding semantics |
| Journal / Progress | Still routable despite simplified product direction | Decide whether these remain supported destinations or redirect to the approved tools |
| Unused quick-access components | Old Toolkit and Live / Replays labels remain in source, but imports were not found | Dead-code cleanup, not evidence that these labels currently display |

## Not certified

All actual course videos, private PDFs, real message delivery, uploads, role isolation, billing/webhooks, push notifications, native app lifecycles and real-device keyboards. Admin, basic-tier, logged-out and purchase flows have not been fully browser-audited in this pass. No zero-glitch or launch-ready claim is warranted.

Production Atlas and stock-watch backend validation, design parity and staging/physical-device tests remain launch gates detailed in `qa-release-audit-2026-09-15.md`.
