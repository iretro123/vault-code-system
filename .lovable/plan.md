

## Scoped Inbox Row Layout Fix

### File: `src/components/academy/InboxDrawer.tsx`

**Line 81** — Card row: add `w-full max-w-full`, change `items-center` → `items-start`:
```
- flex items-center gap-2 rounded-xl px-2.5 py-2.5
+ flex items-start gap-2 w-full max-w-full rounded-xl px-2.5 py-2.5
```

That's it. The rest is already correct:
- Inner button (line 89): already has `min-w-0 flex-1`
- Text div (line 95): already has `min-w-0 flex-1`
- Title (line 96): already uses `truncate`
- Body (line 97): already uses `line-clamp-1`
- Dismiss button (line 107): already has `shrink-0`
- No `overflow-hidden` on the card row

One line change, one file. No shared component changes.

