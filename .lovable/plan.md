

## Rename "Trade Floor" → "Chat" on Dashboard

Three files contain dashboard-facing "Trade Floor" labels that should become "Chat":

1. **`src/components/academy/dashboard/QuickAccessRow.tsx`** line 6 — `label: "Trade Floor"` → `label: "Chat"`
2. **`src/components/academy/QuickAccessBar.tsx`** line 6 — `label: "Trade Floor"` → `label: "Chat"`
3. **`src/components/academy/dashboard/HeroHeader.tsx`** line 24 — `label: "Trade Floor"` → `label: "Chat"`

No other changes needed. The community page header and guidelines modal keep their own naming as those are inside the community section itself.

