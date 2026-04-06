

## Add "President Trump Speaks" Event to Calendar

### What
Insert one new high-impact event for today (2026-04-06): **President Trump Speaks** at **1:00 PM ET**.

### Database Insert

```sql
INSERT INTO market_events (id, date, time_et, country, event_name, impact, actual, estimate, prev, unit, fetched_at)
VALUES (
  'mw-president-trump-speaks-2026-04-06',
  '2026-04-06',
  '13:00',
  'US',
  'President Trump Speaks',
  'high',
  NULL, NULL, NULL, '',
  NOW()
);
```

One row, no code changes. The calendar UI will pick it up automatically and show it as a high-impact event at 1:00 PM ET.

### Files
No file changes needed — database insert only.

