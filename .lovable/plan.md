

## Mobile UI Cleanup for Learn Section

### Problems Found

1. **Module page (`AcademyModule.tsx`) — Bottom action bar hidden behind MobileNav**: The "Mark Complete" / "Next Lesson" buttons sit at the very bottom, but the fixed `MobileNav` (Menu/Academy/Settings tabs) overlaps them. There's a horizontal scrollbar visible too, suggesting content overflows.

2. **Module page — Layout uses `h-[calc(100vh-4rem)]`**: This doesn't account for the mobile bottom nav (~60px + safe area). On mobile, the content area needs to be shorter to leave room for MobileNav.

3. **Module page — Sidebar takes full width on mobile**: When `sidebarOpen` is true, the lesson list sidebar takes `w-full`, completely hiding the content area. This is intentional (mobile shows one panel at a time), but the toggle button (chevron up/down) is small and non-obvious. Users may not realize they can toggle back.

4. **Module page — Bottom action bar overflows horizontally**: The "Previous", "Mark Complete", and "Next Lesson" buttons don't wrap on small screens, causing horizontal scroll.

5. **Course grid (`AcademyLearn.tsx`) — Cards are single-column, fine**: The grid is already `grid-cols-1 md:grid-cols-2`, which is correct for mobile.

6. **Module page — No bottom padding for safe area**: The bottom action bar doesn't account for `env(safe-area-inset-bottom)`.

### Solution

**File: `src/pages/academy/AcademyModule.tsx`**

1. **Fix viewport height on mobile** — Change `h-[calc(100vh-4rem)]` to account for MobileNav. Use a responsive approach: on mobile add extra bottom padding or reduce height to `h-[calc(100vh-4rem-4rem)]` (header + mobile nav). Better: use `pb-20 md:pb-0` on the scrollable area and let the layout flex naturally.

2. **Fix bottom action bar overlap** — On mobile, add `mb-20` or `pb-[calc(env(safe-area-inset-bottom)+5rem)]` to the bottom bar so it sits above MobileNav. Or make the bottom bar sticky with enough bottom offset.

3. **Fix button overflow** — Stack the action buttons vertically on small screens or use `flex-wrap`. Change the bottom bar to:
   - Previous button on the left
   - Mark Complete + Next stacked or wrapped on the right
   - Use `flex-wrap gap-2` to prevent horizontal overflow

4. **Improve lesson list toggle UX** — Replace the small chevron with a clearer "Show Lessons" / "Hide Lessons" button text on mobile.

5. **Add safe-area bottom padding** — Add `pb-[env(safe-area-inset-bottom,0px)]` to the bottom action bar.

### Technical Details

**`src/pages/academy/AcademyModule.tsx`** changes:

Line 151 — Container height:
```tsx
// From:
<div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
// To:
<div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden">
```

Lines 412-465 — Bottom action bar: wrap in mobile-safe container, add bottom margin to clear MobileNav:
```tsx
<div className="border-t border-border bg-card/50 px-4 md:px-6 py-3 shrink-0 mb-16 md:mb-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">
  <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
    {/* buttons with smaller text on mobile */}
  </div>
</div>
```

Lines 167-174 — Better toggle button on mobile:
```tsx
<Button
  variant="ghost"
  size="sm"
  className="h-8 px-2 md:hidden gap-1 text-xs"
  onClick={() => setSidebarOpen(!sidebarOpen)}
>
  {sidebarOpen ? "Hide" : "Lessons"}
  {sidebarOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
</Button>
```

**`src/pages/academy/AcademyLearn.tsx`** — Minor: ensure bottom padding clears MobileNav. The outer `pb-10` should become `pb-24 md:pb-10` to match AcademyLayout's pattern.

