

## Fix: Footer clipped by mobile bottom nav

**Root cause:** The mobile reader overlay (`fixed inset-0 z-50`) and the MobileNav (`fixed bottom-0 z-50`) share the same z-index. The bottom nav covers ~56px of the reader footer, hiding the progress dots and page label.

### Changes

**`src/pages/academy/AcademyPlaybook.tsx`** (line 173):
- Add `pb-16` (64px bottom padding) to the mobile reader overlay container so the footer content sits above the mobile nav
- Alternatively, bump z-index to `z-[60]` to render above the nav — but padding is cleaner since it keeps the nav accessible for navigation

The fix is one class addition:
```
- <div className="fixed inset-0 z-50 bg-background flex flex-col">
+ <div className="fixed inset-0 z-50 bg-background flex flex-col pb-16">
```

When in fullscreen mode (`mobileFullscreen`), we should NOT add the padding and instead bump z-index higher to truly go fullscreen over the nav bar:
```tsx
<div className={cn(
  "fixed inset-0 bg-background flex flex-col",
  mobileFullscreen ? "z-[60]" : "z-50 pb-16"
)}>
```

This way:
- **Normal mode**: footer sits above the bottom nav (padded), nav still usable
- **Fullscreen mode**: overlay covers everything including nav, true immersive reading

### Files modified
- `src/pages/academy/AcademyPlaybook.tsx` — add conditional padding/z-index on mobile reader overlay

