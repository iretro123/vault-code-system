

## Reorder Community Tabs

One-line change in `src/pages/academy/AcademyCommunity.tsx` — reorder the `TABS` array to: Chat → Signals → Wins → Announcements.

```typescript
const TABS = [
  { key: "trade-floor", label: "Chat", roomSlug: "trade-floor" },
  { key: "daily-setups", label: "Signals", roomSlug: "daily-setups" },
  { key: "wins", label: "Wins", roomSlug: "wins-proof" },
  { key: "announcements", label: "Announcements", roomSlug: "announcements" },
] as const;
```

No other files affected.

