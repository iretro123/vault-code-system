

## Playbook Loading Speed: Root Cause Analysis and Fix Plan

### Root Cause (Not an internet issue -- it's an architecture bug)

The slow loading when selecting a chapter is caused by two problems:

**Problem 1: PDF re-downloads on every chapter switch**
The `PlaybookReader` uses `key={activeChapter.id}` which fully unmounts and remounts the component on each chapter change. This causes the `<Document>` component from `react-pdf` to re-download and re-parse the entire PDF file (~4 seconds) every single time, even though all chapters use the same PDF file -- just different page ranges.

Network proof from profiling:
- Edge function (signed URL): **1,688ms**
- PDF file download: **4,097ms**
- Total delay per chapter switch: **~5.8 seconds**

**Problem 2: Redundant API calls**
The page makes 6-8 duplicate calls each for `academy_role_permissions`, `user_roles`, and `academy_user_roles` on every navigation. This wastes bandwidth and adds latency.

### Fix Plan

**1. `src/pages/academy/AcademyPlaybook.tsx`** -- Remove `key={activeChapter.id}` from PlaybookReader

Stop remounting the reader on chapter change. Instead, let the reader handle chapter changes internally by reacting to prop changes. This preserves the loaded PDF `<Document>` across chapter switches, making chapter navigation instant.

```text
Before: <PlaybookReader key={activeChapter.id} chapter={activeChapter} ... />
After:  <PlaybookReader chapter={activeChapter} ... />
```

**2. `src/components/playbook/PlaybookReader.tsx`** -- Handle chapter changes via props instead of remount

- Remove the `key`-based reset pattern. Instead, use a `useEffect` on `chapter.id` to reset `currentPage`, `docLoaded` state, and `notifiedEnd` ref when the chapter changes (already partially there at line 68).
- Crucially, the `<Document>` component stays mounted and the PDF stays in memory. Only the `<Page pageNumber={...}>` re-renders with new page numbers -- this is near-instant.

**3. Cache the signed URL** -- `src/pages/academy/AcademyPlaybook.tsx`

The signed URL is valid for 1 hour but currently re-fetches on every page mount. Store it in a module-level variable so navigating away and back doesn't trigger another 1.7s edge function call.

```text
// Module-level cache
let cachedPdfUrl: string | null = null;
let cachedAt = 0;
const URL_TTL = 50 * 60 * 1000; // 50 min (refresh before 1hr expiry)
```

### Expected Result

- **First load**: ~5.8s (unchanged -- PDF must download once)
- **Chapter switching after first load**: **< 200ms** (instant page flip, no re-download)
- **Returning to playbook within 50 min**: **< 500ms** (cached signed URL, PDF in browser cache)

### Files Modified
- `src/pages/academy/AcademyPlaybook.tsx` -- remove `key` prop, add signed URL caching
- `src/components/playbook/PlaybookReader.tsx` -- handle chapter changes via useEffect instead of remount

