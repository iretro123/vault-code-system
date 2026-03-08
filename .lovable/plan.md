

## Fix Back Button Behavior on Mobile

### Problem
When a user is viewing a lesson on mobile (sidebar hidden), the back arrow always navigates to `/academy/learn` (the courses list). The expected behavior: tapping back should first reveal the lesson list sidebar, and only navigate to courses if the sidebar is already visible.

### Solution

**File: `src/pages/academy/AcademyModule.tsx`** (lines 154-160)

Change the back button's `onClick` handler to be context-aware on mobile:
- If on mobile and sidebar is **closed** → open the sidebar (`setSidebarOpen(true)`) instead of navigating away
- If on mobile and sidebar is **open** → navigate to `/academy/learn`
- On desktop → always navigate (sidebar is always visible)

```tsx
<button
  onClick={() => {
    if (isMobile && !sidebarOpen) {
      setSidebarOpen(true);
    } else {
      navigate("/academy/learn");
    }
  }}
  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
>
  <ArrowLeft className="h-4 w-4" />
  <span className="hidden sm:inline">Courses</span>
</button>
```

This requires importing and using the `useIsMobile` hook (already available in the project). The hook may already be imported — if not, add:
```tsx
import { useIsMobile } from "@/hooks/use-mobile";
const isMobile = useIsMobile();
```

One file change, minimal impact, matches user expectation of progressive back navigation on mobile.

