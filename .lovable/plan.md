

## Fix: Module Slugs + Auto-Sync

### Problem
- Module 1's slug is `"Vault Operator Install (Universal Start)"` (spaces + parentheses = broken URL)
- Its 6 lessons reference `module_slug = "discipline-foundations"` which doesn't match
- When you edit a module title via admin UI, the slug never updates, causing drift

### Fix 1 — Database: Repair Module 1 slug
Run a migration to set Module 1's slug to a clean, URL-safe value derived from its current title, and update the 6 lessons to reference the new slug.

```sql
-- Fix module 1 slug
UPDATE academy_modules
SET slug = 'chapter-1-vault-install-universal-start'
WHERE id = 'c3ff0921-f89c-4886-b20d-8f7ffa127ade';

-- Re-link lessons to new slug
UPDATE academy_lessons
SET module_slug = 'chapter-1-vault-install-universal-start'
WHERE module_slug = 'discipline-foundations';
```

### Fix 2 — Code: `handleUpdateModule` in `AcademyLearn.tsx`
When an admin edits a module title, regenerate the slug from the new title AND update all `academy_lessons` rows that reference the old slug:

```ts
const handleUpdateModule = async (id: string, oldSlug: string) => {
  const newSlug = editTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // 1. Update module with new slug
  await supabase.from("academy_modules").update({ title, subtitle, slug: newSlug }).eq("id", id);
  // 2. Re-link lessons
  if (newSlug !== oldSlug) {
    await supabase.from("academy_lessons").update({ module_slug: newSlug, module_title: editTitle }).eq("module_slug", oldSlug);
  }
};
```

No title changes. No lesson changes. Everything stays exactly as you set it — just the internal slug linkage gets fixed.

