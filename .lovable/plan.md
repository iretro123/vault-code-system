

## Convert Calendar Times from Military (24h) to Standard (12h AM/PM) ET

### Problem
Times like `08:30`, `10:00`, `14:30` display in 24-hour military format. Need standard 12-hour with AM/PM, all labeled ET.

### Solution
Add a helper function `formatTimeET(time: string | null)` that converts "08:30" → "8:30 AM", "14:30" → "2:30 PM", etc.

Replace raw `time_et` display in two places:
1. **Next Up hero card** (line 167): `{nextEvent.time_et} ET` → `{formatTimeET(nextEvent.time_et)} ET`
2. **Event row** (line 281): `{e.time_et || "—"}` → `{formatTimeET(e.time_et)}`

### Helper
```typescript
function formatTimeET(t: string | null): string {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
```

### File
| File | Change |
|------|--------|
| `src/components/academy/community/EconomicCalendarTab.tsx` | Add `formatTimeET` helper, use it in 2 display locations |

