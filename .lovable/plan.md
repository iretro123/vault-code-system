

## Hide Two Lessons From Members

### What
Set `visible = false` on two specific lessons so they are hidden from regular members but still visible to admins/coaches (with a "Hidden" badge).

### Lessons to Hide
1. **"What Is the Stock Market? (March 21st)"** — in Chapter 2 (Risk Management)
   - ID: `383ab622-322f-450a-9b50-cc3a961fb9b7`
2. **"Chapter Intro: Why Structure Comes Before Setups"** — in Chapter 3 (Trading Psychology)
   - ID: `53c26d02-48b4-4a27-a4f9-35af90630c9b`

### How
One database migration:
```sql
UPDATE academy_lessons SET visible = false, updated_at = now()
WHERE id IN (
  '383ab622-322f-450a-9b50-cc3a961fb9b7',
  '53c26d02-48b4-4a27-a4f9-35af90630c9b'
);
```

No code changes needed — the frontend already filters `visible = false` lessons for non-admin users and shows a "Hidden" badge for admins.

### File

| File | Change |
|------|--------|
| Database migration | Set `visible = false` on 2 lessons |

