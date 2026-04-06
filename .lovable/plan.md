

## Fix: Assign Icon Avatars to Users With Initials-Only Avatars

### Problem
11 users have `initials:hsl(...)` as their `avatar_url`, which renders only their text initials in a colored circle — no actual avatar graphic. This includes JerX and stjohntrades. These users were likely created before the backfill migration or the migration used the wrong format for them.

### Fix

**Database migration** — Update all `initials:` avatar URLs to random `icon:` avatars:
- Run an UPDATE on `profiles` where `avatar_url LIKE 'initials:%'`
- Assign each user a random icon from the existing icon library (diamond, hexagon, shield, etc.) with a random color
- Uses the same `icon:{id}|{color}` format that the onboarding and backfill systems use
- 11 users affected: BAILEY BAILEY, Elliott Lee, Francis V, JerX, John Doe, Karen Greenfield, Kenya, Maria Cordero, Michael Zamora, stjohntrades, Wid

### Technical Detail
The SQL will use `random()` to pick from the icon/color arrays, converting each `initials:` URL to a proper `icon:` URL so `ChatAvatar` renders an actual graphic instead of just letters.

### Files Changed
- Migration SQL only (no code changes needed — the rendering logic already handles `icon:` format correctly)

