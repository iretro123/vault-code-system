

## Polish Transitions — Stable, Premium Loading States

### What's wrong now
The two loading states in `AcademyLayout.tsx` (auth loading at line 83 and profile/hydration loading at line 106) render a **standalone div without the sidebar**. Since they're inside the `SidebarProvider` flex container, the spinner appears in the sidebar's slot (left side), and when loading completes the entire layout snaps into place — sidebar appears, content jumps right. This causes the jarring "big refresh" feel.

### Changes

**File: `src/components/layout/AcademyLayout.tsx`**

1. **Include sidebar in both loading states** — Replace the standalone loading divs with the full layout shell (sidebar + content area + ambient background). The spinner stays centered in the content area to the right of the sidebar, so when loading finishes there's zero layout shift.

2. **Add a smooth fade-in on the main content** — When the `<Outlet />` finally renders, wrap it in a subtle `animate-in fade-in` (80ms) so the content appearance feels intentional rather than instant-pop.

Both loading returns change from:
```tsx
<div className="min-h-screen bg-background flex flex-col">
  <div className="h-14 ...">skeleton header</div>
  <div className="flex-1 flex items-center justify-center">
    <Loader2 ... />
  </div>
</div>
```

To:
```tsx
<div className="h-[100dvh] flex w-full bg-background relative overflow-hidden">
  {/* Same ambient background */}
  <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" style={{...}} />
  <AcademySidebar />
  <div className="flex-1 flex flex-col min-w-0 relative z-[1]">
    <div className="h-14 border-b border-white/[0.06] bg-background flex items-center px-4">
      <Skeleton className="h-5 w-32" />
      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  </div>
</div>
```

3. **Content fade-in** on the `<main>` tag wrapping `<Outlet />` — add `animate-in fade-in duration-150` so page content eases in smoothly after loading resolves.

### Result
- Sidebar stays visible during loading — no layout jump
- Spinner is centered in the content area, not the sidebar zone
- Ambient background renders during loading — no flash from white to dark
- Content fades in smoothly when ready
- Zero layout shift between loading → loaded states

### Files changed
| File | Change |
|------|--------|
| `src/components/layout/AcademyLayout.tsx` | Both loading states include sidebar + ambient BG; main content gets fade-in |

