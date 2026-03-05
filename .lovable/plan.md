

## Mobile Playbook Reader — Full-Screen Takeover

**Problem:** On mobile, the 3-column layout (260px sidebar + reader + 300px right panel) renders the PDF tiny and unreadable. Users have to pinch-zoom and scroll horizontally — unusable.

**Solution:** On mobile, replace the 3-column layout with a two-step flow:

1. **Chapter list view** — full-screen scrollable list of chapters (replaces the 260px sidebar)
2. **Reader view** — when a chapter is tapped, the PDF reader takes over the full screen as an overlay/sheet. Swipe down or tap X to go back to the chapter list.

### Changes

**`src/pages/academy/AcademyPlaybook.tsx`** (main changes):
- Import `useIsMobile` hook
- On mobile: show chapter list as the default full-width view (no sidebar columns)
- When a chapter is selected on mobile, render the reader as a full-screen overlay (`fixed inset-0 z-50 bg-background`) with a back button and the PlaybookRightPanel content accessible via a bottom sheet or expandable section
- Hide the 3-column layout entirely on mobile, show it only on `md:` and above
- Add a `← Chapters` back button in the mobile reader header to return to the list

**`src/components/playbook/PlaybookReader.tsx`**:
- Make the PDF `Page` width responsive: use `window.innerWidth - 32` (with padding) on mobile instead of fixed `680`
- Remove zoom controls on mobile (pinch-to-zoom is native and more intuitive)
- Keep nav controls (Prev/Next) at the bottom

**Layout on mobile:**
```text
Step 1 (chapter list):
┌──────────────────────┐
│ Vault Playbook       │
│ Your Trading OS      │
├──────────────────────┤
│ Ch 1: Introduction ✓ │
│ Ch 2: Risk Rules   → │
│ Ch 3: Locked 🔒      │
│ ...                  │
└──────────────────────┘

Step 2 (tap chapter → full-screen reader):
┌──────────────────────┐
│ ← Chapters  Pg 2/8  │
├──────────────────────┤
│                      │
│   [Full-width PDF]   │
│                      │
├──────────────────────┤
│ [◀ Prev]  ●●○○  [▶] │
└──────────────────────┘
```

### Files modified
- `src/pages/academy/AcademyPlaybook.tsx` — mobile-aware layout with full-screen reader overlay
- `src/components/playbook/PlaybookReader.tsx` — responsive PDF width, mobile-optimized controls

