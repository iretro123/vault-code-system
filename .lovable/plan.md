

## Make Study Notes Editable for Admins

### Problem

The edit button for lessons (including study notes) is hidden behind a **hover-only** pencil icon in the sidebar lesson list. On mobile/touch devices, hover doesn't work — so you literally cannot access the edit panel. Even on desktop, it's easy to miss.

### Fix

Add an inline **Edit** button directly next to the "Study Notes" heading in the main content area, visible only when Admin Mode is ON + user has `manage_content` permission. Clicking it opens the existing edit panel (reuses `editingId` state). Also show the edit button even when there are no notes yet, so admins can add notes to lessons that currently have none.

### Changes

**File: `src/pages/academy/AcademyModule.tsx`**

1. **Add an inline edit trigger next to Study Notes** (around line 378-386):
   - Show an "Edit Lesson" button (pencil icon) next to the lesson title area for admins
   - This triggers the same `setEditingId` / `setEditTitle` / etc. flow that already exists
   - Works on mobile since it's a visible button, not hover-dependent

2. **Show study notes section even when empty for admins** so they can see the "Edit" affordance and add notes

3. **Make the sidebar edit icons always visible on mobile** — change `opacity-0 group-hover:opacity-100` to also show on touch devices (`md:opacity-0 md:group-hover:opacity-100 opacity-100` or similar)

### No database or backend changes needed — this is purely a UI discoverability fix.

