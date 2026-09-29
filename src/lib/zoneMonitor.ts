export type ZoneMonitor = Record<string, { lastCheckedAt: number | null; blocked: boolean }>;
export function zoneMonitorStatus(check: ZoneMonitor[string] | undefined, now: number) {
  if (check?.blocked) return "paused";
  if (!check?.lastCheckedAt) return "unverified";
  const age = now - check.lastCheckedAt;
  return age >= 0 && age <= 180_000 ? "fresh" : "stale";
}
