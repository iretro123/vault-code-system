

## Fix: Week Schedule Sheet — Mobile Safe Area + Desktop Layout

### Problems
1. **Mobile**: Bottom sheet content gets clipped by iPhone home indicator and Android nav buttons — needs safe area padding at the bottom
2. **Desktop**: Full-width bottom sheet looks awkward on wide screens — should be a centered dialog or side panel instead

### Fix

**`src/components/academy/live/WeekScheduleSheet.tsx`**

**Mobile safe area fix:**
- Change `pb-6` on the session cards container (line 141) to `pb-[calc(1.5rem+env(safe-area-inset-bottom,16px))]` — this pushes content above the iPhone home bar and Android nav buttons
- Add `pb-[env(safe-area-inset-bottom,8px)]` to the SheetContent itself as extra safety
- Reduce `max-h-[85vh]` to `max-h-[80vh]` on mobile to sit higher above the bottom nav

**Desktop layout upgrade:**
- On `md:` and above, switch from `side="bottom"` to a centered modal/dialog style using responsive classes
- Add `md:max-w-lg md:mx-auto md:rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:max-h-[70vh]` to SheetContent so on desktop it renders as a clean centered card instead of a full-width bottom sheet
- Add `md:inset-x-0` so it centers horizontally on desktop

### Files Changed
- `src/components/academy/live/WeekScheduleSheet.tsx`

