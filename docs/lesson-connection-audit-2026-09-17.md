# Lovable lesson connection verification

## Verified source

Inspected the published Lovable project `3f554d41-bb0c-4e4a-ac27-d63167a6e1a4`, latest reported commit `1c72e066e40b7a0c74d841c77160d8def00e5cf9`, its lesson hook/player, live database schema, all lesson records including hidden rows, module visibility, and local Git history containing video URL changes. The local app points to the same Supabase project, `oemylhcjqncovnmvvgxh`.

Both versions read `public.academy_lessons.video_url`; the redesigned player has no separate video import. No second lesson/video column was found in the public database schema. No lesson/video audit-log actions were available to recover prior values. The inspected code history did not supply mappings for the blank rows.

## Results

- 49 visible rows have supplied YouTube URLs, representing 41 distinct URLs because Beginner Bridge duplicates eight lessons.
- All 41 URLs returned HTTP 200 and titles from YouTube’s oEmbed metadata endpoint. This verifies metadata availability, **not actual playback, embedding permission, or full native-device behavior**.
- 27 visible rows have empty URLs in the live Lovable database itself. Their modules are also visible. No supplied mapping was found for those blank rows; do not substitute loosely related videos by title similarity.
- Follow-up recovery: verified RZ's public channel `@rubenzamora__` lists `eJ-ITm3SuCw` as “The REAL Way to Learn Day Trading – 1:1 Mentorship (LIVE Call)”, matching the existing Chapter 9 record and blank Chapter 7 mentorship lesson. Restored this one Chapter 7 URL in production using an ID/title/empty-value-guarded update. The database returned the updated row. Counts after recovery: 50 visible linked lessons, 26 visible blanks. Public channel video, stream, playlist and topic searches did not establish exact mappings for the remaining blanks.
- Therefore no evidence establishes that a code transfer removed the links. The timestamp/cause of blank database fields remains unknown. A working Lovable page for one of those exact lessons would identify any alternative source or project.

## Local reliability change

The lesson hook now refreshes on focus, reconnect and visible-tab return, subscribes to lesson changes when supported, and checks every 60 seconds while visible. The live publication currently includes `academy_messages` but not `academy_lessons`, so polling/focus refresh are the working fallback; instant Realtime lesson updates are not claimed. Cleanup removes timers/listeners/channel; existing request tickets reject stale chapter responses.

One live URL was restored as described above. No visibility flags, schema, publication, existing URLs, or lesson progress IDs changed. No application deployment occurred. The guarded, idempotent SQL is recorded in `supabase/migrations/20260917040000_restore_verified_mentorship_video.sql`; rerunning it will not overwrite an existing URL.

## Evidence and remaining scope

### Follow-up: authenticated playback and Lovable agent investigation

Asked the original Lovable agent twice, in read-only plan mode, to inspect source, database, and historical messages. It reported searching 4,725 messages and finding only two user-supplied lesson URLs (indicator setup and Chapter 10), both already connected. Its first count table was inconsistent; a follow-up corrected it to 89 total rows, 76 visible, 50 linked, 26 visible blanks and 13 hidden blanks. Independently inspected original messages confirming the owner explicitly hid Chapter 1 lessons 2–9 and two other unfinished lessons. No visibility or thumbnails were changed.

Using the supplied test login and live backend reads in local app Chrome:
- All 50 linked visible lessons successfully started playback (HTML video unpaused, currentTime > 0, readyState >= 2). First pass 46/50; four passed on retry after waiting for frame readiness. This verifies startup, not watching every video end-to-end.
- Four 390px mobile-width samples (Vault Install, Beginner Bridge, Chapter 2, Chapter 3) also started playback, with 390×219.375 player bounds. This is browser viewport testing, not physical-iPhone certification.
- Logs: `/tmp/vault-all-linked-playback.log`, `/tmp/vault-live-player-retry.log`, `/tmp/vault-live-player-mobile-final.log`.
- Repeatable read-only test: `scripts/qa-live-lessons.cjs`, credentials required via environment (not stored).
- Corrected the web embed origin to the actual page origin; native still uses the existing HTTPS relay. Original hardcoded origin was **not proven to be the reported root cause**: playback succeeded before this hardening too.
- 19 targeted tests, TypeScript, and production build passed. Build log: `/tmp/vault-video-origin-build.log`. Player-origin change is local, not deployed to production.

Chapters 1–3 are not universally missing their URLs. Tested saved lessons play. The remaining blank lesson records cannot be filled accurately from the recovered evidence. No unrelated substitutions were made, and no additional live rows were modified in this follow-up.

Read-only row snapshot: `/tmp/vault-lesson-link-audit.json`. YouTube metadata results: `/tmp/vault-youtube-link-results.jsonl`. Unit suite and build: `/tmp/vault-video-connect-tests.log`, `/tmp/vault-video-connect-build.log`.

Messaging/friends and Atlas still require their staged backend rollout. Atlas additionally needs its provider configuration and teaching-source review. These cannot be certified by repairing lesson refresh or by the YouTube metadata checks.
