# Navigation and dead-end audit — September 15, 2026

Local-only changes. No production posts, uploads, account changes or deployment.

## Results

- 24 member routes/query variants × mobile 375×667 and desktop 1440×900: **48 navigation cases passed**. Each checks the visible Home exit and browser Back (Home itself only checks Home; browser Back at the app entry is intentionally not hijacked).
- Covered Home, Live, Learn, Setup, Trade, Support, all seven available settings sections plus invalid section, Community, Bootcamp, Resources, Profile, Questions, Journal, Progress, Playbook empty state, missing course and missing room.
- Both sizes: Community Chat/Signals/Wins/Calendar switching, Backspace editing the draft without leaving the page, stock-watch dialog Escape dismissal, classroom Escape dismissal.
- Separate mobile menu reproduction initially failed Escape dismissal. After the fix, menu open/Escape close plus subsequent Community interactions passed.
- 286 automated tests passed across 41 files, including 5 new safe-back regressions. That full run preceded the final sidebar keyboard patch; the patch was then verified in the real browser harness and TypeScript.
- TypeScript passed before sidebar patch; final repeat executed after patch (see task output).

## Fixes

1. Auth Back, legal Back, membership Back and Bootcamp Back now use router-owned history index, not total browser history length. Direct entry uses a useful in-app fallback with replacement instead of navigating to an unrelated external page or doing nothing. Normal in-app previous-page behavior remains.
2. Mobile sidebar explicitly handles Escape from its own content; nested dialogs retain independent behavior. This prevents a focused tooltip/layer from swallowing the menu-close intent. Added a navigation-menu accessible label.

## Existing useful behavior retained

Settings uses URL sections and preserves visited form state. Community tab changes replace the current history entry, avoiding a long tab-by-tab Back maze. Invalid course/room links resolve to Learn/Community in the tested fixture; invalid settings sections show Profile. Lesson and Playbook source already have explicit return/close controls. Browser Back at the initial app entry can leave the app by normal browser design; no global history trapping or Backspace interception was added.

## Limits

Browser harness uses synthetic authenticated member and intercepted empty backend collections. This is not every lesson, populated thread, PDF, premium/admin workflow or OS-level Android hardware Back/iPhone swipe-back test. No permission/purchase or account-destructive actions were exercised. Physical-device and populated staging-content checks remain required before claiming no navigation traps anywhere.

Evidence: `/tmp/vault-navigation-mobile/results.json`, `/tmp/vault-navigation-desktop/results.json`, `/tmp/vault-navigation-menu/results.json`. Reproduce with `QA_NAV=1 QA_DEVICE=iphone-se` or `desktop` using `scripts/qa-device-matrix.cjs`. Artifacts are temporary; source script and regression tests remain local in the repository.
