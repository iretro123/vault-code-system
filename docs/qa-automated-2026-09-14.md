# Automated QA — 2026-09-14

Scope: local repository automated tests and TypeScript checks. No deployment, production writes, user messages, or paid API requests were performed. This is not a physical iPhone/Android certification.

## Results

| Check | Result |
| --- | --- |
| Initial Vitest run | 35 files: 262 passed, 3 failed |
| Final Vitest run at 23:10 ET | 36 files: **272 passed, 0 failed** (includes the concurrent safety agent's 4 upload tests) |
| App TypeScript (`tsc --noEmit -p tsconfig.app.json`) | Pass after fixes |
| Node/config TypeScript (`tsc --noEmit -p tsconfig.node.json`) | Pass after fixes |
| ESLint repository audit | **12 errors, 95 warnings** across 525 files; not release-clean |

Commands use `/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` to run the repository's Vitest, TypeScript and ESLint packages.

## Fixes made

- Community navigation tests now mount the real QueryClientProvider required by the stock-watch component. All original navigation assertions remain; no tests skipped or weakened.
- Three Supabase update payloads now use generated table-specific update types instead of unrestricted dictionaries (profile form, community profile card, legacy cockpit).
- Removed unsupported `exact` options from role queries; string accessible-name matching remains exact by default.
- Removed the unused legacy calendar-download helper from the shared calendar module, so Node can import calendar generation without DOM requirements. Google Calendar behavior is unchanged.
- Atlas now checks provider response-envelope types and rejects malformed text/content arrays gracefully rather than throwing property-access exceptions. Three new regression cases cover malformed/null envelopes. No model/API request was made.

## Remaining lint findings

- `PlaybookReader.tsx:311`: permanently false debug block (`no-constant-binary-expression`).
- `previewAuthStorage.ts:38`, `membershipReconciler.ts:31`: prefer-const.
- `safeText.ts:16`: intentional NUL regex is flagged by no-control-regex; do not delete sanitization just to clear lint.
- `playbookReader.test.tsx`: 5 explicit-any test fixture types.
- `ghl-full-access-started/index.ts:112`: explicit-any.
- `sync-stripe-members/index.ts:258,344`: unused-expression syntax.
- 48 exhaustive-deps warnings and 47 hot-refresh export warnings. No rules-of-hooks errors found. Dependency warnings require careful per-hook assessment, not blind autofix.

## Release limits

Green unit tests do not validate real-device keyboards, safe areas, native push permission, StoreKit/billing, production RLS, live audio/video, flaky networks, or Safari PDF rendering. Those require the separate browser/device and staging passes. The suite mocks external services and does not prove the data feed or AI model is available in production.

The existing TypeScript settings are non-strict for the app; a clean check means compatibility with current settings, not proof of null-safety everywhere. Repository lint is still failing. Do not characterize this run as proving zero defects or all-device readiness.

## Follow-up pass at 23:16 ET

- **38 files / 276 tests passed**, including 3 new native viewport tests and the concurrent agent's external-link safety test.
- Both TypeScript targets passed again; production Vite build passed in 4.71 seconds.
- Added names to the Community mobile navigation button, Inbox/message close controls, and profile edit cancel control. The setup checkbox was a false positive in the simple DOM scanner: its wrapping label provides its accessible name. The globally reported desktop close button was in a hidden Inbox drawer, but was unlabeled when opened, so it was fixed too.
- Native regression tests verify keyboard module initialization, no document-wide prevention of horizontal touch scrolling, and clearing keyboard state when viewport width changes on rotation. These use synthetic events, not a native-device driver.
- Built bundle inspection confirms keyboard handlers are bundled and no bare `import('@capacitor/keyboard')` specifier remains.
- Build warnings remain: large RoomChat (~1.68 MB minified / 232 KB gzip), App (~724 KB / 221 KB gzip), and Trade (~539 KB / 149 KB gzip) chunks; 3 ambiguous Tailwind duration utilities; mixed static/dynamic clipboard import. These are optimization debt, not build failures.
