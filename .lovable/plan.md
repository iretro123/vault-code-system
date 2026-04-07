

## Hide Lesson: "How to Setup Your First Brokerage (March 21st)"

Set `visible = false` on this lesson so members can't see it. Admins/coaches will still see it with a "Hidden" badge.

### Data Update

```sql
UPDATE academy_lessons SET visible = false, updated_at = now()
WHERE id = '19b901e9-3f6f-4057-abcc-63e49bbd399e';
```

No code changes needed — the frontend already filters hidden lessons for non-admin users.

| Target | Change |
|--------|--------|
| Database (`academy_lessons`) | Set `visible = false` on lesson ID `19b901e9-...` |

