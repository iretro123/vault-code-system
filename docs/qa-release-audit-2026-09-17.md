# Vault release audit — September 17, 2026

## Verdict

Local improvements and regression tests are complete for the fixes below. **Not yet a production release sign-off.** Several redesigned screens are preview-only, and live services, hosted media permissions, and multi-account messaging still need staging verification.

## Fixed in this audit

- Lesson loading no longer stays stuck when browser storage is full or blocked. Failed fetches expose an error and retry; older chapter requests cannot overwrite the current chapter.
- Lesson players now provide a reload action and original-video exit, plus slow-loading feedback. Unsafe source URL schemes and URLs containing credentials are rejected. An iframe load event is explicitly not treated as proof that a video plays.
- Profile cards show a retry state instead of an endless spinner for missing profiles. Switching members cannot let an older response replace the newly selected profile.
- Trade-card actions were inert. Ask Coach now opens the existing coach drawer, Log Trade opens the journal, and Discuss trade starts a reply without sending anything automatically.
- Local browser preview now skips the separate automatic membership-provisioning request. Production membership authorization logic was not changed.
- Legacy profile avatar color/icon choices have accessible labels and selected-state announcements; color targets are enlarged to 44 pixels.

## Verification and evidence

- Full Vitest suite: 338 tests across 54 files passed, including seven new lesson/player/profile regression tests.
- TypeScript app check passed; production build passed. Large bundle warnings remain (notably GIF picker, App, Trade, and Playbook).
- Chromium: 144 route/device cases (24 routes × six viewports, 320–1440 px), with synthetic authenticated data. No detected horizontal overflow, sampled clipped elements, page exceptions, or tested navigation failures. Checked home exits, browser Back, mobile menu dismissal, community tab changes, Backspace editing, and scroll reversal/endpoints where applicable.
- WebKit: 40 route/device cases (10 routes × four viewports including landscape). No detected overflow or sampled clipping. One Help-route case recorded a membership-provisioning network/access-control error in the isolated fixture environment. The preview request path is now guarded; that full WebKit matrix has not been rerun after the guard.
- The matrices ran before the final trade-action/avatar changes; the full automated suite and type check were rerun during the fixes. Matrices are fixture-backed checks, not proof of all populated states or every physical iPhone/Android device.
- Raw browser results: `/tmp/vault-release-sept17/results.json` and `/tmp/vault-webkit-qa/results.json` (temporary local artifacts).
- Existing repository lint run still reports 17 errors, including test `any` types, two prefer-const findings, a control-character regex, and existing backend lint findings. Not a clean lint gate.

## Remaining launch gates

1. **Production design parity.** Home, Live, Support, and Trade contain DEV/localhost-specific implementations. Setup is DEV-gated in App routes. A production build can show old designs or omit the redesigned route. Do not simply remove preview guards: some screens intentionally suppress writes or use local data. Extract production-safe components and test their live data contracts on staging.
2. **Messaging backend.** New DM/social/member-discovery migrations are local. Apply through the normal reviewed deployment process and verify member A/B delivery, private attachments, blocked users, third-party denial, reconnects, and unread state with test accounts. Local demos are not live messaging.
3. **Atlas and stock watch.** Verify hosted Atlas flags/function deployment and the production `/api/stocks-to-watch` route; a local middleware response does not prove a hosted pipeline works.
4. **Real media.** Check every published lesson with an authorized staging account: playback, seeking, fullscreen, mobile rotation, expired/restricted provider links, and PDF access. The Schedule 1:1 intro also needs its configured video URL. This audit hardened player failure recovery; it did not certify every hosted video.
5. **Backend/security and release operations.** Review production RLS/storage policies and deployed secrets, billing/webhooks, native permissions, push delivery, and account recovery. These require separate staging/production-readiness evidence. This was not a penetration test or certification that no data leaks exist.
6. **Accessibility/performance.** Finish keyboard/screen-reader and physical mobile keyboard tests, OS text scaling, slow-network tests, lint cleanup, and bundle work. The setup checkbox heuristic flagged an unnamed button, but it is nested in a text label; verify with an accessibility-tree test rather than assuming the heuristic proves a missing name.

No deployment, database migrations, live messages, or production account modifications were intentionally performed. Automated browser sessions intercepted backend traffic and used synthetic members.
