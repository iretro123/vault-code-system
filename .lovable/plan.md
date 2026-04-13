

## Widen Dashboard Cards to Fill Available Space

### The Problem
The dashboard container has `max-w-6xl` (1152px max-width), but the content area after the sidebar is roughly 860-1020px on typical laptop screens. On wider desktop screens, this creates a visible gap on the right side.

### The Fix

**File: `src/pages/academy/AcademyHome.tsx`**

Change `max-w-6xl` to `max-w-7xl` (1280px) on both the loading skeleton and the main content wrapper. This fills the available space on laptop/desktop without breaking mobile layout (mobile ignores max-width since content is narrower).

Two lines to change:
- Line 104: loading skeleton `max-w-6xl` → `max-w-7xl`
- Line 121: main content `max-w-6xl` → `max-w-7xl`

That's it — one class swap, two instances. Cards already use `w-full` / grid layout so they'll naturally expand to fill the wider container.

