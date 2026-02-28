

## Remove Dismiss Animation, Keep DB Persistence

### File: `src/components/academy/InboxDrawer.tsx`

**1. Remove animation wrapper from `ItemList` rows**
- Remove the outer `<div>` with `transition-all duration-200 ease-out` / `opacity-0 -translate-x-4 scale-95 max-h-0` classes
- Call `onDismiss(item.id)` directly on X click instead of `triggerDismiss`

**2. Remove animation wrapper from `WhatsNewList` cards**
- Same: remove the transition wrapper `<div>` around `WhatsNewCard`
- Call `onDismiss(item.id)` directly

**3. Remove `useDismissAnimation` hook**
- No longer needed — delete the hook definition at the top of the file

**4. DB persistence already works**
- `dismissInboxItem` in `AcademyDataContext` already does `supabase.from("inbox_items").delete().eq("id", itemId)` — no backend changes needed

Result: instant removal on X click, no animation jank, item deleted from DB permanently.

