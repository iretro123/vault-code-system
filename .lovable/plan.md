# Findings: "Reconnecting to chat…" on resume (analysis only, nothing changed)

## Relevant files
- `src/hooks/useRoomMessages.ts` (lines 400–545): realtime channel, retry, catch-up poll
- `src/components/academy/community/ChatConnectionStatus.tsx`: 1.5s show / 3s hide debounce
- `src/components/academy/RoomChat.tsx` line 1437: renders the status from `connection === "reconnecting"`
- `src/hooks/useSmartRefresh.ts`: global resume refresh, only after 5+ min hidden
- `src/main.tsx`: native bootstrap. No `@capacitor/app` `appStateChange` / `resume` listener anywhere in `src`

## Root causes (confirmed from source)
1. **Stale-channel callbacks cause a retry loop.** The retry timer calls `supabase.removeChannel(channel)`. That old channel then reports `CLOSED` to its own subscribe callback. `disposed` is still false, so the callback sets "reconnecting" again, bumps `retry` and schedules another timer. When that timer runs, `channel` already points at the new channel, so it removes the healthy one. Each resume can churn two or three times and push backoff toward 15s. That keeps the banner up well past its 1.5s threshold.
2. **Background timers stall, and resume doesn't reset them.** While the screen is locked or the tab is hidden, the socket heartbeat dies, so the channel reports `TIMED_OUT` or `CLOSED`. The backoff timer gets throttled or frozen. On return, `onWake` only calls `catchUp()`. It never resets `retry`, clears the pending timer or resubscribes right away. So reconnecting waits on the stale backoff (up to 15s).
3. **Auth is refreshed too rarely.** `useSmartRefresh` only calls `realtime.setAuth` after 5+ minutes hidden. The access token can expire during a shorter lock plus a slow wake, so the rejoin fails and loops again. The per-room retry does refresh the token, but only after the backoff delay.
4. **Native apps get no resume signal.** In iOS and Android WebViews, `visibilitychange` and `focus` don't fire reliably. Without an `App.addListener("resume")` hook, nothing triggers an immediate reconnect.
5. **The banner can't tell a hidden screen from a real outage.** A disconnect that happens while the app is hidden is still reported, and it shows 1.5s after return, even when recovery is a few seconds away.

## Recommended fixes
- **Per-channel guard.** Capture each channel in a local variable inside `subscribe()`. Ignore callbacks where `ch !== channel`. Detach `channel` (set it to null) before `removeChannel`, so an intentional close never schedules a retry.
- **Resume handler (web and native).** Add one `reconnectNow()`. It clears `retryTimer`, sets `retry = 0`, gets a fresh session with `setAuth`, resubscribes if not `live`, then calls `catchUp()`. Call it from `visibilitychange` (visible), `online`, `focus` and Capacitor `App.addListener("resume")`, loaded lazily the way `main.tsx` loads the keyboard plugin.
- **Don't flag while hidden.** When the page is hidden, record the disconnect without setting "reconnecting". On resume, allow a short grace period (about 3–4s after `reconnectNow`) before the banner can appear. Keep the existing 1.5s/3s debounce and its tests for real outages.
- **Always refresh auth on resume.** Refresh on every resume, not only after 5 minutes. A cheap `getSession` is enough.
- Optionally, **limit retries to the active room.** Pause retries for inactive rooms (`activeRef`) to cut churn when many rooms are mounted.

## Missed-message and retry risks
- **Gap longer than 40 messages:** `catchUp` pulls only `limit(PAGE_SIZE=40)` newer rows, once. Busy rooms after a long lock lose everything beyond 40. Fix: page until a batch comes back short, or refetch the whole room when the gap is large.
- **Edits and deletes during downtime are never recovered.** `catchUp` only fetches rows newer than the latest message by `created_at`. Fix: on resume, re-read the visible window, or query `updated_at > lastSeen` if that column exists (needs checking before relying on it).
- **Same-timestamp rows:** `gt(created_at)` skips a message that shares the latest timestamp. Use `gte` plus the existing id dedupe.
- **Silent failures:** `catchUp` swallows errors, and `catchUpBusy` can skip the resume call if a throttled poll is still running. Retry once after a failed catch-up.
- **Optimistic sends while offline:** dedupe matches on body and user. Two identical quick messages could collapse into one. Send a client id if the schema allows it.
- **Leaked channels:** random channel names plus removing the wrong channel (cause 1) can leave extra sockets joined. That duplicates events (dedupe hides it) and adds billing load.

## Tests to add later (in your Codex branch)
- A `CLOSED` from a removed channel doesn't schedule a retry or remove the current channel.
- A resume event resubscribes right away and resets backoff.
- A hidden-time disconnect followed by quick recovery never shows the status.
- Catch-up pages past 40 rows.
- Extend `src/test/roomRealtime.test.tsx` (the mock needs to track per-channel callbacks) and `chatConnectionStatus.test.tsx`.

## Unverified
- Whether `academy_messages` has an `updated_at` column.
- Actual WebView event order on iOS 26 and Android 16. Needs a device log.
- Supabase client heartbeat or worker settings, which weren't inspected.
