

## Fix Inbox Panel: Fit Content, Visible Dismiss X, Premium iOS Feel

### Root Cause
The panel is `w-[400px]` but the `max-w` calc combined with the sidebar offset is causing it to collapse or clip. The dismiss X is absolute-positioned and overlaps the ExternalLink icon.

### Changes — `src/components/academy/InboxDrawer.tsx`

1. **Panel width**: Change from `w-[400px]` to `w-[340px]`. Remove the problematic `max-w-[calc(...)]` — use a simpler `max-w-[90vw]` fallback so it never clips.

2. **Dismiss X — always visible, iOS-style**: Remove the absolute-positioned X. Instead, place it inline at the end of each item's flex row as a dedicated column. Always visible at `opacity-40`, hover to `opacity-100`. Styled as a 28x28 rounded-full button with `bg-white/[0.06]` and `hover:bg-white/[0.12]` — clean iOS sheet dismiss feel.

3. **Remove ExternalLink icon overlap**: Remove the `ExternalLink` icon entirely from the item row (it adds clutter and conflicts with X). The item click already navigates — no need for a separate indicator.

4. **Card layout tightening**: Reduce horizontal padding from `px-3` to `px-2.5`, keep vertical `py-2.5`. Title gets no extra `pr` since X is now inline, not overlapping.

5. **Panel overflow**: Add `overflow-hidden` to the panel container to ensure `rounded-xl` clips properly.

### Result
- Panel fits within viewport, no cut-off
- Each item has a clear, always-visible circular X button (iOS style) on the right
- Dismissing removes from DB + local state + updates the sidebar badge count
- No overlap between icons

