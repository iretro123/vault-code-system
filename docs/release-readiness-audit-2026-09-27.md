# Vault OS release-readiness audit - September 27, 2026

## Decision

**HOLD publication. This is a local hardening pass, not production certification.**
No production functions, migrations, website, App Store build, or Play build were deployed. No purchase, account creation, reset email, member message, or push notification was sent. The working tree includes earlier unrelated work and is not an isolated release revision.

## Findings fixed locally

1. **Membership identity (high):** `provision-manual-access` previously accepted a caller-selected billing email if the caller owned the submitted user ID. Recovery now requires the target account's confirmed email to match, including operator recovery. Stripe recovery also checks an approved current/legacy price rather than any subscription on the customer.
2. **Incomplete payment granting access (high):** webhook, reconciliation, sweep, and sync jobs treated `incomplete`/`unpaid` as renewal grace. They now share a fail-closed mapping. Incomplete is paused; unpaid/expired/unknown are canceled. Existing `past_due` renewal grace is retained, not silently redesigned.
3. **Unknown-plan grants (high):** manual reconciliation and the upgrade sync no longer fall back to a paid plan for an unrecognized price. Reconciliation now propagates access-write errors before syncing roles.
4. **Duplicate-purchase recovery risk:** a billing-portal network error no longer automatically falls back to a new checkout. Explicit no-customer responses retain the existing fallback; refresh remains available.
5. **Chat reconnect deadlock:** the restart lock is released after channel replacement, not only after a successful handshake. Session/auth-refresh failures schedule retries. Repeated failures and unmount cleanup have regression coverage.
6. **Push registration ordering:** native listeners are installed before silent registration. Delayed token callbacks check component lifetime. Tests cover pending setup and unmount.
7. **Live route test drift:** three failing tests expected a removed inline management screen. Tests now assert the actual admin-panel Live destination and hide management when permission/admin state is lost. This does not certify the destination's server authorization.
8. **UI refinement:** welcome/signup/login use the same native Apple-oriented typography direction as onboarding, headings balance their wrapping, and login secondary controls have 44px touch targets. Blue-and-black styling is retained.

## Remaining release blockers and risks

- **Payment settlement and reconciliation:** active subscription status alone is not complete proof of settled payment for all payment methods. Delayed-payment events, event ordering, invoice failure/recovery, refunds, duplicate customers, multi-subscription accounts, and interrupted role/access writes still need a sandbox matrix. Recovery currently checks only the first Stripe customer and a bounded subscription list. Do not advertise guaranteed immediate unlock until these cases pass.
- **Role/access consistency:** frontend full access depends on an allowlisted role, while server access, profile state, native purchases, and legacy billing jobs use additional records. Backend/RLS tests against the actual deployed schema are required for every paid channel. A successful local confirmation test is not that proof.
- **Ban enforcement:** the Academy layout handles `access_status=revoked` only after the basic-tier branch. `useAuth` intentionally keeps banned sessions. Verify `is_banned` and banned/revoked states across frontend routes and deployed RLS; a role must not bypass a ban.
- **Native recovery parity:** AccessBlockModal explicitly suppresses web billing on iOS, but not Android. Review Android recovery against the intended Google Play flow before release.
- **Live freshness:** `useLiveNow` polls every 30 seconds and refreshes on focus/visibility. It is not an instantaneous subscription. Verify scheduled/manual start, end, expiration, timezones, network failure, and whether this latency meets product requirements.
- **Chat:** local handler/reconnect tests pass, but no two-account live send/receive, attachment delivery, latency measurement, or sustained background/resume test was performed in this pass. No zero-delay claim.
- **Push:** Android Firebase configuration is now present locally (unlike the September 17 audit). iOS entitlement and registration callbacks exist. Credentials were not displayed. Neither actual background delivery nor notification-tap routing on a distribution build was tested. Partial listener-setup failure handling and deep-link allowlisting warrant follow-up.
- **Content and AI:** earlier September 17 audit documents reported 26 visible lessons without video links and an AI gateway credit block. These historical findings were NOT revalidated today; they remain verification gates, not assertions of current outages.
- **Quality/performance:** full-repository lint reported 20 errors initially; two in the touched sync function were fixed and scoped lint passed. Remaining errors are in existing helpers/test mocks and the GHL function. Build warns about large App (~750KB) and GifPicker (~1.55MB) chunks, ambiguous Tailwind durations, and mixed static/dynamic imports. No measured performance budget or all-page accessibility sign-off.
- **Runtime verification:** Deno is unavailable locally, so frontend TypeScript success does not type-check Edge Functions. Validate the changed functions in an isolated backend before deployment.

## Verification performed

| Check | Result and limits |
| --- | --- |
| Initial unit run | 534 passed, 3 failed; Live tests described above |
| Final unit run | 559 passed in 88 files |
| Frontend TypeScript | Passed, `tsc -p tsconfig.app.json --noEmit` |
| Production web build | Passed; warnings retained |
| Whitespace | `git diff --check` passed |
| Scoped lint | Changed backend files, notification hook, access-recovery component and new/updated regression tests passed |
| Browser funnel | Welcome -> access chooser -> Full Access account form -> existing-member login -> forgot-password screen verified through visible DOM |
| Login details | Email/password labels; username/current-password autocomplete; 16px input text; empty reset submission disabled |
| Width check | Document width equaled viewport at observed 557 CSS pixels; requested 390px override did not yield reliable screenshot output |
| Screenshots | Capture failed or produced a duplicated/stale-looking composite; not acceptable visual evidence for full mobile sign-off |
| Native inventory | Existing simulators listed; no new native build, sync, device run, or push/purchase action performed |

## Funnel and access inventory

| Surface | Intended behavior | Evidence level |
| --- | --- | --- |
| `/welcome` | New visitors get Get started; existing members get Log in | Browser checked |
| `/welcome?step=access` | Free chat/course vs $99 full plan clearly separated | Browser checked |
| `/create-account` | Free account, no Stripe purchase | Source/tests; no account created |
| `/create-account/full` | Account first, payment second | Browser/source/tests |
| `/auth`, recovery | Existing-account credentials and reset flow | UI checked; actual auth/reset delivery untested |
| Web checkout | Signed-in identity; Stripe-hosted confirmation | Source/mocked tests; sandbox payment pending |
| Checkout return | Wait for server entitlement and paid role, then onboarding/Home | Unit tests; deployed path pending |
| Onboarding | Profile, selected avatar, experience, tour, goal, alerts, review/social, arrival | Existing unit tests; full visual rerun pending |
| Free Academy | Learn/free course, Community, settings/profile; paid tools gated | Allowlist/source/tests; real free account/RLS pending |
| Paid Academy | Home, learning, community/Signals, Live, Trade OS, Coach and other member routes | Route inventory/source/tests; real paid account/RLS pending |
| Admin | Separate management permission checks | Live entry tests; full privileged route audit pending |
| Dev previews | Development-only demonstration routes, not evidence of live membership | Source verified |

## Prior keyboard/GIF work

Located the task titled **Build Vault OS trading automation** and inspected local implementations. Keyboard-aware expression-popover limits, signal-form scroll body/sticky actions, native viewport handling, GIF loading/error/retry states, and room reconnect code are present in this checkout. Related unit tests pass in the full suite. This does not prove every change in that task's history was merged or that a previously uploaded native binary contains today's changes. Rebuild, sync, and test the release binary with the software keyboard open before signing off.

## Official guidance reviewed

- [Apple onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding): keep onboarding brief, relevant, and optional where possible. Applied as a design direction, not a claim that this app has Apple certification.
- [Apple typography guidance](https://developer.apple.com/design/human-interface-guidelines/typography): native readability and hierarchy guide the restrained typography changes; Dynamic Type/VoiceOver still need device testing.
- [Capacitor keyboard API](https://capacitorjs.com/docs/apis/keyboard): native keyboard events and resize behavior must be tested on the actual platforms, not inferred from desktop viewport size.
- [Capacitor push notifications](https://capacitorjs.com/docs/apis/push-notifications): listener/registration setup is only one part of delivery; platform configuration and actual device verification remain necessary.
- [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment): server-confirmed payment/webhook handling, including delayed methods, is required; a success URL alone must never grant access.

## Required before publication

1. Confirm an isolated test backend and Stripe test mode. Do not use the live shared backend as an assumed staging environment.
2. Validate all modified Edge Functions with Deno and integration tests, including identity rejection and all status mappings; review legacy/native entitlement preservation and bans.
3. Run test checkout, cancel/retry, delayed payment, duplicate webhook, renewal failure/recovery, refund, and restore scenarios. Check both DB/RLS access and visible channels for free and paid accounts.
4. Resolve remaining lint errors and verify outstanding content/AI gates. Measure startup and chat/GIF performance on a mid-range device.
5. Rebuild native apps and test keyboard/GIF/signal composer, back navigation, Live freshness, two-account messages, notification receipt/taps, accessibility, and purchase recovery on signed builds.
6. Complete reliable phone/tablet/desktop visual coverage for every release route, then freeze a reviewed release revision and deploy backend/web/native changes in a coordinated release with rollback coverage.
