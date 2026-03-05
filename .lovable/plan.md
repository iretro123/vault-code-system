

## Fix: Restore progress bar and page label below PDF on mobile

**Issue:** The footer section (dot progress bar + "Page X of Y") is likely being clipped on mobile because the fixed overlay doesn't properly allocate space for the bottom controls. The `flex-1 min-h-0` on the reader content area may be consuming all space.

### Changes

**`src/components/playbook/PlaybookReader.tsx`** (footer area, lines 239-280):
- Add a visible "Page X of Y" text label in the footer bar, centered between Prev/Next buttons, above or below the dot progress indicators
- Ensure the footer has `shrink-0` so it never gets compressed away on mobile
- Layout in footer becomes:

```text
┌────────────────────────────────┐
│ [◀ Prev]  Page 2 of 8  [▶ Next]│
│         ●●○○○○○○               │
└────────────────────────────────┘
```

**`src/pages/academy/AcademyPlaybook.tsx`** (mobile overlay, lines 191-208):
- Add `overflow-hidden` to the outer fixed container to prevent content from pushing the footer off-screen
- Ensure the PlaybookReader wrapper div has proper flex constraints so the footer remains pinned

### Files modified
- `src/components/playbook/PlaybookReader.tsx` — add page label to footer, ensure `shrink-0`
- `src/pages/academy/AcademyPlaybook.tsx` — fix flex overflow on mobile overlay

