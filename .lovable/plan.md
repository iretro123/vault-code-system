

## Upsert Referral on Signup (avoid duplicate rows)

### File: `src/pages/Auth.tsx` (lines 94-107)

Replace the current insert-only block with an update-first approach:

1. First, try to UPDATE an existing `referrals` row where `referrer_user_id = savedRef`, `status = 'clicked'`, and `referred_user_id IS NULL` — set it to `signed_up` with the new user's ID and email
2. If no row was updated (count 0 or error), fall back to INSERT a new row with `status: signed_up`
3. Keep `clearStoredReferral()` and `[Referral]` debug logs either way

```typescript
// Try to upgrade existing "clicked" row first
const { data: updated, error: updateErr } = await supabase
  .from("referrals" as any)
  .update({ referred_user_id: newUserId || null, referred_email: email, status: "signed_up" } as any)
  .eq("referrer_user_id", savedRef)
  .eq("status", "clicked")
  .is("referred_user_id", null)
  .select("id")
  .limit(1);

// Fallback insert only if no clicked row existed
if (!updated || (updated as any[]).length === 0) {
  await supabase.from("referrals" as any).insert({ ... } as any);
}
```

No schema changes. No new files. Single file edit.

