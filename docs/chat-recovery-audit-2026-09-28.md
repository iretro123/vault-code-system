# Chat recovery audit - September 28, 2026

## Local changes

- Suspend retry timers and safety polling while the document is hidden or offline.
- Resume immediately on visibility, focus, pageshow, or network restoration; reset retry backoff.
- Cancel scheduled replacement when a channel self-recovers, preserving a healthy connection.
- Keep the existing per-channel stale callback guard and account-scoped message cache.
- Give foreground recovery five seconds before showing a quiet status line. Clear it immediately on recovery or backgrounding.
- Distinguish an offline browser from a reconnecting socket. Do not claim that offline sends succeeded.

## Verification

Regression tests cover background pause/resume, duplicate wake events, network return without a socket error, self-recovery, stale channel callbacks, failed session refresh, unmount cleanup, and account isolation. UI tests cover sustained failures, short reconnects, background grace, and genuine offline state.

## Lovable consultation

Reviewed Vault OS: Discipline System, project 3f554d41-bb0c-4e4a-ac27-d63167a6e1a4 in plan mode. Its older cloud source lacks some guards already present locally. It produced `.lovable/plan.md` (reported commit caa1ecc873d46f9361e0e2a42e497609222ec244); no implementation or deployment was requested. Do not approve that plan blindly or overwrite this newer local work.

## Still required before release claims

- Explicit Capacitor native lifecycle integration and signed-in real-device background/lock tests. Current behavior uses document visibility and window lifecycle events; no native App plugin is installed.
- Reconcile edits/deletions received during downtime and test busy-room catch-up, including same-timestamp messages. Current catch-up uses created_at and a bounded batch; polling is not a substitute for comprehensive reconciliation.
- Two authenticated accounts testing message delivery, attachments, pending sends, and recovery on Wi-Fi/cellular changes. No measured zero-latency guarantee.
- Deploy and verify the pending membership policy/Edge Functions, real Stripe and Apple unlock/restore flows, and physical-device APNs/FCM delivery. See the simulator and membership audit reports.

Background suspension is expected on mobile operating systems. Quiet recovery must not conceal a persistent outage. No production deployment was performed for this change.

Reference: https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794
