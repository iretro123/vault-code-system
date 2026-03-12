

# Fix: Make Playbook Reader Taller on Desktop

## Problem
The PDF content area is too short on desktop. The space is consumed by:
1. **Wrong height calc**: `h-[calc(100vh-64px)]` assumes 64px chrome, but the top bar is 56px (`h-14`). Also doesn't account for the fact that the page lives inside `<main class="flex-1 overflow-y-auto">` which already constrains height.
2. **Thick playbook header**: `py-5` padding + large icon wastes ~76px of vertical space.
3. **Reader internal chrome**: The chapter header (`px-6 py-4`) and nav footer (`px-6 py-3` + dot indicators) together consume ~120px inside the reader.

## Changes

### 1. `src/pages/academy/AcademyPlaybook.tsx`
- Change desktop container from `h-[calc(100vh-64px)]` to `h-[calc(100dvh-56px)]` to match the actual 56px header.
- Reduce desktop header padding from `py-5` to `py-3` and shrink icon size to reclaim ~20px.

### 2. `src/components/playbook/PlaybookReader.tsx` (desktop only)
- Reduce the chapter header padding from `px-6 py-4` to `px-4 py-2.5` on desktop.
- Reduce the nav footer padding from `px-6 py-3` to `px-4 py-2` on desktop.
- These changes shave ~30px from internal chrome, giving it back to the PDF.

Mobile remains untouched — all reductions are conditional on `!isMobile`.

**Net gain**: ~50px more vertical space for the PDF on desktop.

