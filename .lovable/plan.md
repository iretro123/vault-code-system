

## iOS Spotlight Search for Desktop

### What it is
Replace the current `CommandDialog`-based search with a custom **iOS Spotlight-style** modal — centered overlay with frosted glass backdrop, smooth animations, instant results as you type, searching **only member-visible** content (modules where `visible = true`, lessons where `visible = true`). Desktop only.

### What changes

**Rewrite: `src/components/academy/VaultSearchModal.tsx`**
- Replace `CommandDialog` with a custom overlay modal styled like macOS/iOS Spotlight:
  - Centered pill-shaped search input with frosted glass background
  - Results appear below in a clean floating panel with subtle blur + shadow
  - Smooth fade-in/scale entrance animation (opacity + transform, ≤120ms)
  - ESC or clicking backdrop closes
- Search queries **only visible content** (add `.eq("visible", true)` to both `academy_modules` and `academy_lessons` queries)
- Add `academy_modules` as a new search category (currently only searches lessons, not modules)
- Remove `academy_messages` from search results (member visibility — users should not search other people's messages)
- Keep `academy_announcements` (those are broadcast to all members)
- Result categories: **Modules**, **Lessons**, **Announcements**
- Each result row: icon + title + subtitle + right-arrow hint on hover
- Keyboard navigation: arrow keys to move selection, Enter to navigate
- Empty state: clean Spotlight-style prompt with ⌘K hint
- Loading state: subtle shimmer, not a spinner
- Desktop only: add a `hidden md:block` or equivalent guard so the search button in sidebar only shows on `md+` screens

**Update: `src/components/layout/AcademySidebar.tsx`**
- Add `hidden md:flex` or similar to the search button so it only appears on desktop
- No other changes needed

**Update: `src/index.css`**
- Add Spotlight-specific styles:
  - `.vault-spotlight-backdrop` — frosted dark overlay
  - `.vault-spotlight-input` — large pill input with subtle glow
  - `.vault-spotlight-results` — results panel with glass effect
  - `.vault-spotlight-item` — result row with hover highlight
  - Entry/exit animation keyframes

### Search logic
```
Modules: academy_modules WHERE visible=true AND (title ILIKE %q% OR subtitle ILIKE %q%)
Lessons: academy_lessons WHERE visible=true AND (lesson_title ILIKE %q%)
Announcements: academy_announcements WHERE title ILIKE %q%
```

### Files
1. `src/components/academy/VaultSearchModal.tsx` — full rewrite to Spotlight UI
2. `src/components/layout/AcademySidebar.tsx` — hide search button on mobile
3. `src/index.css` — Spotlight animation/glass styles

