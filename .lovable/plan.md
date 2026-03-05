

## Place fullscreen button on the PlaybookReader header row (mobile only)

**Approach:** Add the Maximize2/Minimize2 toggle to the far right of the PlaybookReader's chapter header bar — right after the "Page 1/2" text. This keeps it inline, no overlap, clean.

Also: remove the PlaybookRightPanel from mobile overlay as previously agreed.

### Changes

**`src/components/playbook/PlaybookReader.tsx`**:
- Add optional `onToggleFullscreen` and `isFullscreen` props
- In the header row (line 133), add a small icon button after the "Page X / Y" + "~X min" div, only when `onToggleFullscreen` is provided (mobile only)
- Layout: `[Reading / Title]` ... `[Page 1/2  ~5min]  [⛶]` — the button sits flush right

**`src/pages/academy/AcademyPlaybook.tsx`**:
- Add `mobileFullscreen` state
- Remove the `PlaybookRightPanel` section from mobile overlay (lines 205-218)
- When `mobileFullscreen` is true, hide the outer "← Chapters" header bar (lines 174-186)
- Pass `isFullscreen` and `onToggleFullscreen` to `PlaybookReader` on mobile
- When fullscreen, show a small floating Minimize2 button in bottom-right corner to exit

### Result on mobile
```text
Normal:
┌────────────────────────────────┐
│ ← Chapters         Ch. Title  │  ← outer header
├────────────────────────────────┤
│ Reading       Page 1/2   [⛶]  │  ← reader header, button far right
│          [PDF content]         │
│ [◀ Prev]  ●●○○○  [Next ▶]    │
└────────────────────────────────┘

Fullscreen (outer header hidden):
┌────────────────────────────────┐
│ Reading       Page 1/2   [▣]  │  ← still visible
│          [PDF content]         │
│ [◀ Prev]  ●●○○○  [Next ▶]    │
└────────────────────────────────┘
```

### Files modified
- `src/components/playbook/PlaybookReader.tsx` — add fullscreen toggle button prop + render in header
- `src/pages/academy/AcademyPlaybook.tsx` — fullscreen state, remove right panel on mobile, conditionally hide outer header

