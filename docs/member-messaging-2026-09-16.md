# Member messaging — local implementation

Route: `/academy/community/messages`. Entry points: Community heading, direct-message sidebar icon, and other members' profile cards. The bell retains staff notifications. DM entry resumes the last available conversation; a profile entry opens that exact member. Staff inbox tables and histories are unchanged.

## Implemented

- Separate participant-only member conversations and stored text messages; avatars use the existing profile renderer.
- Desktop split view / mobile conversation list and back navigation.
- Search by member name or username; latest-message preview and unread dot.
- Realtime inserts, incremental reconnect catch-up, paginated history, optimistic send with stable UUID, explicit failure and retry.
- Per-account/per-conversation drafts; failed outbox entries survive a same-tab reload. No cross-account global message cache.
- Server-side blocking, input validation, 30 messages/minute limit, shared-guest exclusion, participant RLS. No authenticated direct INSERT/UPDATE grants: writes use restricted RPCs.
- Localhost always uses visibly labeled sample members. Local sends do not touch Supabase. No fake automatic replies or online indicators.
- September 17: neutral graphite palette, member friend requests/accept/remove, conversation message search (latest 50 matches), shared community emoji/GIPHY controls, reviewed file sends up to 15 MB. New private `vault-member-files` storage bucket, signed URLs and restrictive policies that fence off legacy broad storage access. No public URLs for DM files.

## Verification

- Nine React/unit tests: local write isolation, account switch, conversation switch, drafts, send, block/unblock, search, ID deduplication, failed-send retry, delayed fetch isolation.
- Isolated PostgreSQL/PGlite migration exercise: two distinct accounts exchange messages, third account cannot read/send, direct sender spoof denied, retries idempotent, read markers, block/unblock, empty input, rate limits, shared guest and anonymous denial.
- TypeScript compilation and production build; browser screenshot/interaction check of the local mobile layout and sample send.
- PGlite validates SQL and row security, not hosted Supabase realtime delivery. Production build retains existing large-chunk warnings.

## Before release

1. Apply `20260917010000_member_messaging.sql` then `20260917020000_member_social_media.sql` to a **staging** Supabase project and regenerate database types. Local code uses a separate adapter while types await the migration.
2. Verify two authenticated browsers exchanging messages via actual Supabase websocket transport, disconnection/reconnection, blocked send, unread markers, revoked/expired membership, and database privileges against the complete existing schema.
3. Verify iOS/Android software keyboards and desktop widths on physical devices. Current browser check is not physical-device certification.
4. Add a user-facing privacy/moderation policy and reporting flow before broad member rollout. The database includes blocking, not a report-review workflow.
5. This is not full Discord parity. Reactions, quoted replies, private-channel typing, message requests (distinct from friend requests), push notifications, and server-wide unread badges remain follow-up work. Existing staff attachments are unaffected.
6. Decide retention, deletion/export, account expiry behavior, and inbox pagination beyond the latest 100 conversations. Audit shared-account restrictions with the production entitlement model.

No push, deployment, live migration, or messages to real members were performed.

### Real-member discovery follow-up

The picker now shows real, read-only community profiles on localhost, not sample search names. Verified CEO RZ is pinned, then members are sorted by contribution count among the latest 500 nondeleted top-level Trade Floor posts in the last 30 days. This is recent activity, **not online presence**. Search filters this readable preview roster; production `discover_message_members` also searches other eligible members. `20260917030000_member_discovery.sql` must follow the other two migrations. RZ's self row is visible but disabled. All preview sends remain local. Browser inspection confirmed real profiles and the requested ordering; no live message was sent.

## September 17 checks and remaining media work

The isolated PostgreSQL test also applies the social/media migration and checks sender-only file references, recipient-only reads even with an old permissive storage policy, third-party upload denial, friend-request acceptance ownership, private message search, and invalid GIF domains. React tests cover local file selection/send without storage writes, GIF/emoji callbacks, friendship state and search reset. This does not verify the hosted Storage service, file MIME inspection or malware scanning. Before launch test real signed-URL expiry, uploads/downloads, content moderation/reporting, storage quotas and removal of orphaned uploads on staging. Blob URLs in local preview are deliberately temporary; they are not production file storage.
