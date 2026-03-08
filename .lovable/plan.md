

## Fix: Duplicate Date Text + Styling on Live Sessions Page

### Problem
Line 453 in `AcademyLive.tsx` has the date format repeated twice:
```
{format(..., "EEEE, MMMM d")} at {format(..., "EEEE, MMMM d")} at {formatTime(...)} EST
```
This produces: **"Sunday, March 8 at Sunday, March 8 at 8:00 PM EST"**

### Fix (1 line change)

**File: `src/pages/academy/AcademyLive.tsx` (line 452-453)**

Remove the duplicate `format()` call and change the text color to white/bold:

```tsx
<p className="text-sm font-semibold text-white mt-1">
  {format(new Date(nextSession.session_date), "EEEE, MMMM d")} at {formatTime(nextSession.session_date)} EST
  {nextSession.duration_minutes > 0 && <span className="ml-2 text-white/50">· {nextSession.duration_minutes} min</span>}
</p>
```

Changes:
- Remove the duplicated date format call
- `text-white/45` → `text-white` + `font-semibold` for bold white text
- Duration separator `text-white/30` → `text-white/50` so it's still visible but secondary

