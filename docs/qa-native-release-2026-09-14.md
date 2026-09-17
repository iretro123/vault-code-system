# Native / release code audit — 2026-09-14

Scope: read-only source and existing build inspection. No production requests, native installation, push delivery, payments, or real-device tests performed. This is not device certification. Line references describe the audited working tree; other agents may subsequently fix findings.

## Release blockers / high priority

### P1 — Local designs are not the production screens

Verified: `src/App.tsx:33–35` selects DailyLossCalculator only in localhost DEV and selects the old AcademyTrade in production. `src/pages/academy/AcademyLive.tsx:652–656` similarly selects VaultLivePreview only locally. `src/App.tsx:180` declares the setup route only in DEV; `src/components/academy/setup/TradingSetup.tsx:34` redirects outside local preview. `src/pages/academy/AcademyLearn.tsx:447` limits ChartClassroom to preview. Atlas is additionally gated by VITE_ATLAS_ENABLED (`src/components/academy/CoachDrawer.tsx:204`).

Impact: a perfect localhost screenshot pass does not establish release parity. A production build can ship older screens or omit newly approved features. Preserve the local-only protection, but explicitly implement and validate production-ready feature wiring before release; do not simply remove safety guards.

### P1 — Stocks-to-watch backend exists only in Vite development

Verified: `src/components/academy/community/MarketWatch.tsx:20` requests relative `/api/stocks-to-watch`; the adapter is implemented in `scripts/stocksToWatchDev.ts:5–7,47–52` under configureServer. Capacitor loads bundled dist (`capacitor.config.ts:8`), not Vite middleware.

Impact: a packaged app has no implementation of this API at its own local origin; web hosting also needs a separate deployed endpoint. Provide an authenticated production backend plus configurable URL and retained stale/error states. Do not advertise working release watchlists from dev-server success alone.

### P1 — Native keyboard module is left as an unresolved bare import

Verified: `src/main.tsx:90–112` deliberately excludes the dynamic `@capacitor/keyboard` import from Vite processing. Existing dist/assets/index-DbW5doP2.js retains `import("@capacitor/keyboard")`; index.html has no import map. Failure is swallowed. The native package is present, but the JavaScript module must still resolve.

Impact: intended resize mode and native keyboard event handlers are not installed by this code path. The visualViewport fallback may help but is not equivalent. Use a statically analyzable import so Vite bundles the module; then test focus/typing/rotation/keyboard dismissal on actual iOS and Android.

### P1 — Global native horizontal-scroll suppression blocks intentional controls

Verified: `src/index.css:87–94` applies overflow-x:hidden!important even to overflow-x-auto / overflow-x-scroll elements. `src/main.tsx:43–55` cancels all predominantly horizontal touchmove events globally. `src/index.css:83,120` sets pan-y. Intentional horizontal controls include emoji categories (`src/components/academy/chat/NativeEmojiPicker.tsx:187`), schedule day strip (`src/components/academy/live/WeekScheduleSheet.tsx:151`), and TradeFloorHeader filters (`src/components/academy/community/TradeFloorHeader.tsx:121`).

Impact: content beyond the available width can become unreachable in native shells even if mobile-browser emulation passes. Limit overflow containment to page shells and allow intentional horizontal scroll regions.

## Medium priority

### P2 — Rotation can be mistaken for a persistently open keyboard

`src/main.tsx:70–83` remembers a maximum visualViewport height. Rotating portrait to landscape decreases height by more than 120px even without a keyboard; the reduced height never becomes the baseline in that branch. `src/index.css:146–158` then hides bottom navigation and composer quick actions. iOS supports landscape (`ios/App/App/Info.plist:47–59`). This is a source-derived risk, not a physical-device reproduction. Reset baseline on orientation and distinguish focused text entry from rotation.

### P2 — External-link fallback can navigate away despite successfully opening a tab

`src/lib/externalLinks.ts:2–4` calls window.open with noopener/noreferrer and uses a null return to infer popup failure, then navigates the current page away. A null handle is compatible with opener isolation; it is not reliable proof that opening failed. Affects callers of this helper. Use a normal anchor for web or an explicit native external-browser path; test Zoom/calendar/App Store handoff and return without losing session/draft.

### P2 — Onboarding notification button does not use native permission path

`src/components/onboarding/AppOnboarding.tsx:515–519` only checks window.Notification and immediately advances. Native helper `src/lib/pushPermission.ts:47–58` correctly requests Capacitor permission and registers, but is not used here. In native contexts without browser Notification the button is effectively a no-op. Other app notification entry points exist, so this is not proof all push registration is broken. Route onboarding through platform-aware helper and show permission outcome/retry guidance.

### P2 — Auth persistence documentation overstates storage protection

`src/lib/nativeAuthPersistence.ts:6–8` describes Preferences as native keychain / SharedPreferences and mirrors Supabase auth tokens (`:17–35,79–89`). Installed iOS Preferences implementation uses UserDefaults (`node_modules/@capacitor/preferences/ios/Sources/PreferencesPlugin/Preferences.swift:18–19`), not Keychain. This is not proof of remote token compromise, but security documentation is inaccurate and sensitive-token storage deserves deliberate review. Android allowBackup=true (`android/app/src/main/AndroidManifest.xml:5`) also needs backup-policy review. Validate logout/restart/switch-user cleanup using isolated accounts.

## Existing safeguards observed

- Local DEV Supabase REST/storage/server mutations generally blocked by `src/integrations/supabase/localPreviewFetch.ts:2–17`, with explicit PDF/profile read exceptions. This safeguard does not apply to a production-mode localhost build, LAN host, or packaged native app; do not test writes there against production.
- Safe-area CSS exists for native headers, content, footer (`src/index.css:78–144`). Presence alone is not proof against notch/keyboard overlap.
- Native/browser notification deduplication intent exists (`src/hooks/useOSNotifications.ts:25–29`).
- iOS usage descriptions exist for camera, microphone, photos (`ios/App/App/Info.plist:27–32`); Android POST_NOTIFICATIONS exists (`AndroidManifest.xml:41`). OS permission delivery untested.
- Auth hydration occurs before App import (`src/main.tsx:115–124`), avoiding a basic startup hydration race.

## Required device release gate

Use isolated staging accounts and backend for signed native builds. Check small iPhone, notched iPhone, iPad portrait/landscape, small Android, modern Android gesture navigation, Safari, Chrome, and desktop browsers. Include keyboard open/send/dismiss/rotation, pinch and horizontal controls, 200% text scaling, safe-area bottom buttons, notification grant/deny/settings return/background tap, cold restart/auth/logout, purchase/restore sandbox, PDF/video full-screen and return, file picker cancel/error, external Zoom/calendar return. None of those OS-level behaviors can be certified by a viewport screenshot alone.
