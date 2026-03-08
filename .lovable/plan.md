

## Fix Mobile Nav Safe Area for Modern iPhones & Android

### Problem

The bottom nav (`MobileNav`) uses `fixed bottom-0` with no safe-area padding. On iPhone 14/15/16/17 and modern Android phones with gesture navigation, the home indicator bar (~34px) overlaps the nav buttons, making them hard to tap. Browser address bars on Android can also clip into the nav.

`viewport-fit=cover` is already set in `index.html` (good), but `env(safe-area-inset-bottom)` is never used.

### Fix (3 files)

| File | Change |
|------|--------|
| `src/components/layout/MobileNav.tsx` | Add `pb-[env(safe-area-inset-bottom,0px)]` to the `<nav>` element so buttons sit above the home indicator |
| `src/components/layout/AcademyLayout.tsx` | Increase mobile `<main>` bottom padding from `pb-20` to `pb-24` to account for the taller nav with safe area |
| `src/index.css` | Add a `.safe-bottom` utility as a reusable class for any future fixed-bottom elements |

### MobileNav change

```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10 z-50 md:hidden pb-[env(safe-area-inset-bottom,0px)]">
```

This single property ensures:
- **iPhone 14–17**: 34px padding above the home indicator
- **Android gesture nav**: ~24px padding above the gesture bar
- **Older phones with hardware buttons**: 0px (no wasted space)
- **Safari/Chrome bottom toolbar**: content stays above the browser chrome

### Layout padding

```tsx
<main className={`flex-1 overflow-y-auto ${isCommunity ? "pb-6" : "pb-24 md:pb-6"}`}>
```

Bumped from `pb-20` (80px) to `pb-24` (96px) so scrollable content isn't hidden behind the now-taller nav bar on notched devices.

