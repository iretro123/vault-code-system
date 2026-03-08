

## Make Session Card Dates Bigger and More Visible

### Change — `src/pages/academy/AcademyLive.tsx` (line 455)

Replace the current small, muted footer with a centered, large white date display:

**Before:** `text-xs font-semibold text-white/50` with small clock icon, left-aligned
**After:** Centered layout, `text-sm font-bold text-white` schedule text, clock icon slightly larger, generous padding above

```tsx
// Line 455 — replace footer div
<div className="pt-4 mt-auto border-t border-white/[0.06] flex items-center justify-center gap-2">
  <Clock className="h-4 w-4 text-primary/60" />
  <p className="text-sm font-bold text-white tracking-wide">{st.schedule}</p>
</div>
```

One line change. Dates become centered, bigger, bold white, and immediately visible.

