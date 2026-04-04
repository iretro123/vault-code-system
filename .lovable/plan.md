

## Add YouTube Video to Chapter 10 — Vault Archive

### Current State
The module `chapter-10-vault-archive-legacy-replays-advanced-library` exists in the database but has **zero lessons**. The system already supports YouTube embedding via `video_url` on `academy_lessons` — the `AcademyModule` page extracts the YouTube ID and renders an iframe.

### What to do

**1. Insert a lesson into `academy_lessons`**

Insert one lesson row with:
- `module_slug`: `chapter-10-vault-archive-legacy-replays-advanced-library`
- `module_title`: `Chapter 10 — Vault Archive (Legacy Replays & Advanced Library)`
- `lesson_title`: `Vault Archive — Legacy Replays`
- `video_url`: `https://youtu.be/yGXIxEGEQRM`
- `sort_order`: `1`
- `visible`: `true`

This is a single database insert — no code changes needed. The existing `AcademyModule` page will automatically render the YouTube embed via `getEmbedUrl()` which already handles `youtu.be/` short links.

### Files changed
None — this is a data-only change (one DB insert).

