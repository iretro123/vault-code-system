# Background delivery: implementation and release gates

## Implemented locally

Main Chat Room (`trade-floor`) is the provisional notification scope, pending the user's answer about other channels. New saved messages create targeted `chat_message` notifications, including replies. The sender, banned/revoked profiles, and members with notifications disabled are excluded. Paid-room posts and non-chat events do not generate device alerts. The sender rechecks the source message and recipient eligibility at dispatch time. Other existing notification types remain available in-app.

The migration uses Vault secrets `push_webhook_secret` and `push_notify_url`; the former must match the Edge Function's `PUSH_WEBHOOK_SECRET`. The existing historical migration contained a hard-coded webhook credential. Rotate it during deployment without copying it into source or logs. Configure secrets and deploy the schema and sender together. No migration or function deployment was performed here.

Open-page browser notifications now alert when hidden, not while the conversation is visible. This is a fallback only, NOT closed-browser Web Push.

## Not yet implemented or verified

- A production Web Push service worker, subscription storage, VAPID signing/sender and logout cleanup. An iOS web app must be installed to the Home Screen and notification permission granted. An ordinary closed browser tab cannot execute this project's current notification hook.
- Native explicit lifecycle integration, background content synchronization, and physical-device APNs validation. `remote-notification` is present in Info.plist, but the current alert sender does not implement silent background refresh.
- Replace the legacy Android FCM endpoint with HTTP v1 and configured service-account credentials. Existing legacy delivery is a release blocker.
- Durable per-device delivery jobs with leases, retries, exponential backoff, expiration, invalid-token removal and dead-letter visibility. Current pg_net enqueue and notification-level dispatch claim are not a reliable retry queue; partial delivery can strand other devices.
- Authenticated sender/recipient end-to-end testing, active-room suppression on native, badge counts, offline outgoing queue with idempotent send IDs, catch-up of edits/deletions and long message gaps.
- Load-test fanout: the new trigger inserts one notification per eligible profile. Move large-community fanout into a durable worker before high-volume production rollout.

Do not claim 24/7 device execution or guaranteed delivery. The server should retain messages continuously; alert pushes are delivered by the OS subject to permissions/network/system policy. Suspended apps cannot originate arbitrary new outgoing messages. Pending sends need an explicit durable outbox and acknowledgment flow.

## Verification

- 588 application tests passed; TypeScript app check passed.
- `scripts/qa-chat-push-db.mjs` executes the actual migration in PGlite with mocked transport and checks recipient filtering, source deletion, message preservation with missing config, enqueue and non-chat suppression.
- No live push was sent and no production settings were changed.
