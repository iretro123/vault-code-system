

## Move Timer Next to "Notify Me" Button

### Change

**File: `src/pages/academy/AcademyLive.tsx`**

1. **Remove** the `<SessionTimer>` from line 457 (standalone row below the date)
2. **Insert** it into the "Notify Me" row (line 477) so they sit side by side:

```tsx
<div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
  <button className="live-btn-glass text-xs gap-1.5" onClick={(e) => e.stopPropagation()}>
    <Bell className="h-3.5 w-3.5" /> Notify Me
  </button>
  <SessionTimer sessionDate={nextSession.session_date} durationMinutes={nextSession.duration_minutes} />
</div>
```

The timer's `mt-2` will be removed (it's set inside the component) so it aligns inline. One small tweak in `SessionTimer.tsx`: remove the `mt-2` from the container divs so it sits flush in a flex row.

