

## Remove Bottom "Replays" Section from Live Page

### Change
Remove the bottom/main-content "Replays" section (lines 637–651) from the `#live-full-schedule` area. The sidebar Replays section (lines 585–597) stays as-is.

### File
| File | Change |
|------|--------|
| `src/pages/academy/AcademyLive.tsx` | Delete the `{past.length > 0 && ...}` block inside `#live-full-schedule` (lines 637–651) |

