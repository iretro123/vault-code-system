

## Connect "Your Week" Cards to Real Data

Both `CockpitPanel.tsx` and `TradeFloorRightSidebar.tsx` have hardcoded `journalCount = 0` and `reviewStatus = "Due"`. Fix: query `journal_entries` and `lesson_progress` for the current week, matching the pattern already used in `ThisWeekCard.tsx`.

### Changes

**Both files: `CockpitPanel.tsx` and `TradeFloorRightSidebar.tsx`**

In `YourWeekCard`, add `useAuth` + `supabase` imports and a `useEffect` that runs the same queries as `ThisWeekCard`:

- **Trades**: already connected via `useTradeLog()` — no change needed
- **Journal**: `supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("entry_date", monday).lte("entry_date", sunday)`
- **Review**: "Done" if journal count > 0, otherwise "Due" (same logic as `ThisWeekCard`)

Week range: Monday–Sunday (matching `ThisWeekCard`'s `getWeekRange` helper).

Replace hardcoded stubs with state from the query results. Two file edits, no migrations, no new dependencies.

