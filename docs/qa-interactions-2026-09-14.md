# Interaction code audit — September 14, 2026

Scope: read-only inspection of Learn/Playbook, settings, community messages/signals/threads, and Atlas. No live posting, uploads, notifications, or account modifications were performed. This is code-level evidence, not physical Android/iPhone certification. Main QA task owns viewport/browser tests.

## Findings

### P1 — Local upload requests bypassed the read-only guard (fixed)

`src/components/academy/RoomChat.tsx:976` and `src/components/academy/chat/SignalPostForm.tsx:129` used native `fetch` to POST to production Supabase storage, bypassing the guarded client. Selecting a chat attachment can upload it even while message insertion is blocked. Replaced both calls with `localPreviewFetch`. Before this correction, attachment testing on localhost was not safe.

### P1 — Production-build local preview disabled safety (fixed)

`src/integrations/supabase/localPreviewFetch.ts:1` previously required `import.meta.env.DEV`. A localhost production-build preview therefore permitted backend mutations. Local web preview protection now follows localhost/127.0.0.1 regardless of build mode. Native Capacitor localhost is explicitly excluded, preserving native app behavior. Hosted domain behavior is unchanged. Network-address previews are not covered by this localhost-only guard; do not connect physical devices through LAN and assume the guard applies.

### P1 — Failed signal sends erase the structured draft (fixed)

`SignalPostForm.tsx:157–186` awaits a `Promise<void>` callback, then clears the quick ticker or calls `reset()` and closes the form. `RoomChat.tsx:871–875` handles failed message insertion by displaying a toast and returning normally. Therefore a rejected server insertion is interpreted by the signal form as completion, losing ticker/levels/notes. Fix contract to return explicit success, and reset only when true. Regression test with mocked denied/offline send must preserve every field and keep the form open.

### P1 — Playbook progress falsely succeeds after database errors (fixed)

`src/hooks/usePlaybookProgress.ts:104–154` ignores insert/update errors and still changes React progress and last chapter state. Next-page reads call this from `AcademyPlaybook.tsx:153`. A failed save can appear completed/unlocked, then disappear on refresh. Local guard rejection also triggers this misleading behavior. Return save outcome, use explicit local-only draft semantics in preview, and show a non-blocking retry on hosted failure. Test denied writes, offline save, repeated first-page writes, and reload.

### P1 — Per-user reading cache is shared across accounts (reading cache fixed; room cache review remains)

`usePlaybookProgress.ts:27–40, 68–70` stores progress under global `va_cache_pb_progress`; initial state consumes it before the user's fetch. Sign-out does not clear progress (line 45). A second member on the same device may initially see the first member's completion state, and stale progress persists if the fetch fails. Namespace by user ID, reset state on identity change, and ignore stale async responses. Similarly, `src/hooks/useRoomMessages.ts:39–48, 345–353` caches room messages by room alone and resets fetch identity only on room changes; review account-scoped cache lifecycle before account-switch certification.

### P2 — Notification controls visually save even when persistence fails (fixed)

`src/components/settings/SettingsNotifications.tsx:95–108` changes local switch/channel state and ignores `updatePrefs`'s boolean result. `src/hooks/useUserPreferences.ts:75` returns false on a server error without feedback. Members can believe alerts were turned off/on when they were not. Roll back on false and display failure/retry; prevent overlapping updates or reconcile their completion order. Test a failed toggle and rapid toggles with responses resolving out of order.

## Confirmed positive code behavior

- Main chat preserves plain-text drafts when `sendMessage` returns failure and surfaces an error toast.
- Thread replies retain their draft on returned and thrown errors; pending state clears in `finally`; the input handles IME composition and Shift+Enter. Close/send controls have accessible names.
- PDF reader has named zoom controls, loading/error recovery and an external PDF fallback; mobile zoom target CSS overrides the small utility classes. Reader buttons disable appropriately while the page is not ready.
- Atlas has per-user session storage, request abort on reset/unmount, a disabled pending composer, and IME-safe Enter handling. No paid/network question was submitted during this audit.
- Profile editing has an explicit local preview draft path instead of a live profile save.

## Tests run after scoped safety fixes

`src/test/localPreviewUploadSafety.test.ts`: 4 passed — local DEV and local production-build storage methods blocked without network, native localhost excluded, hosted domain unchanged.

`src/test/communityProfileRead.test.ts`: 1 passed — audited GET RPC remains allowed; backend mutations remain blocked.

Total: 5 passed. These tests do not validate successful production uploads, push permissions, physical keyboards, camera/file pickers, or cross-account authorization. Use a separate test backend and non-production accounts for those release gates.

## Follow-up implementation and verification

- Signal and trade recap submit callbacks now return explicit boolean success; the structured and quick forms clear only on true. The main message handler reports false for invalid, rejected, and blocked sends.
- Playbook saves now check database results before changing UI progress, use the existing `(user_id, chapter_id)` primary key for upsert, and stop reading-state writes after failed progress saves. Failed persistence shows a retry-oriented toast. Checkpoint results no longer display as submitted when persistence returns false.
- Reading progress cache keys are now user-scoped; current-user identity gates async results. Local preview keeps reading progress on this browser only and makes no progress mutations to Supabase.
- Notification controls commit visual state only after confirmed save; false/throwing saves show feedback. A shared pending lock prevents overlapping control updates.
- Message avatar and ellipsis triggers now have accessible names including the author's name.

Focused regression run: **10 tests passed**, across `localPreviewUploadSafety`, `communityProfileRead`, `playbookSaveSafety`, and `saveFailureFeedback`. Includes failed quick/structured signal submissions, notification save failure, rejected reading progress, and local per-account reading isolation. `tsc --noEmit -p tsconfig.app.json` passed with no output. No production writes or schema changes.
