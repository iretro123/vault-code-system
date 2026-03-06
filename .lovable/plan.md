

## Admin Edit Panel for Learn Modules

### What we're building
A clean admin-only edit panel that appears when an admin/coach/operator clicks the edit (pencil) icon on a module card or lesson. Instead of the current scattered inline editing, we'll add:

1. **A `visible` column** on both `academy_modules` and `academy_lessons` tables (default `true`)
2. **An improved inline edit card** on the module grid (AcademyLearn.tsx) that lets admins edit title, subtitle, and toggle visibility
3. **An improved edit panel** on the lesson view (AcademyModule.tsx) that lets admins edit lesson title, YouTube link, study notes, and toggle visibility
4. **Hidden modules/lessons** are shown to admins with a visual indicator but completely hidden from members

### Database migration
Add `visible boolean NOT NULL DEFAULT true` to both `academy_modules` and `academy_lessons`.

### File changes

**1. `src/hooks/useAcademyModules.ts`**
- Add `visible` to the `AcademyModule` interface
- For non-admins, filter out `visible = false` modules in the query (pass an `isAdmin` flag or filter client-side)

**2. `src/hooks/useAcademyLessons.ts`**
- Add `visible` to the `AcademyLesson` interface (already not in types but cast with `as any`)

**3. `src/pages/academy/AcademyLearn.tsx`**
- Expand the inline edit card to include a visibility toggle (Switch component)
- Filter `visible = false` modules for non-admins
- Show a "Hidden" badge on hidden modules for admins
- Update `handleUpdateModule` to include `visible` field

**4. `src/pages/academy/AcademyModule.tsx`**
- Expand the edit lesson panel to include: lesson title, video URL, study notes, and a visibility toggle
- Filter hidden lessons for non-admins
- Show a "Hidden" indicator on hidden lessons in sidebar for admins
- Update `handleUpdateLesson` to include `visible` field

### Visibility rules
- `isAdmin` (from `useAcademyRole`) gates all edit UI — this already covers CEO, Admin, Coach roles
- Members see only `visible = true` modules and lessons
- Admins see everything with a subtle "Hidden" badge on invisible items

### No new components needed
The edit forms already exist inline; we're just enhancing them with the visibility toggle and ensuring clean, fast UX.

