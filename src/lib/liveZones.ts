export type ZoneEventKind = "created" | "entered" | "exited" | "invalidated";
export type ZoneTrend = "aligned" | "countertrend" | "unknown";
export interface ZoneEvent {
  id: string;
  zoneId: string;
  symbol: "SPY" | "QQQ";
  timeframe: 5 | 15;
  kind: ZoneEventKind;
  side: "supply" | "demand";
  lower: number;
  upper: number;
  price: number;
  at: string;
  session: "regular";
  trend: ZoneTrend;
}
export interface LiveZone {
  event: ZoneEvent;
  status: "active" | "inside" | "invalidated";
  history: ZoneEvent[];
}

export function zoneUpdateCopy(e: ZoneEvent): { title: string; description: string } {
  const range = `$${e.lower.toFixed(2)}–$${e.upper.toFixed(2)}`;
  const side = e.side === "demand" ? "Demand" : "Supply";
  switch (e.kind) {
    case "created": return { title: `New ${e.side} zone`, description: `${e.symbol} · ${e.timeframe}m: ${side} marked at ${range}. Waiting for price to reach this area; this is not an entry instruction.` };
    case "entered": return { title: "Price entered the zone", description: `${e.symbol} is inside the ${e.timeframe}-minute ${e.side} zone at ${range}. A touch does not confirm a bounce or rejection.` };
    case "exited": return { title: "Price left the zone", description: `Price moved outside ${range}. The zone remains active unless the indicator confirms a break.` };
    case "invalidated": return { title: "Zone broken · Be careful", description: `${e.symbol} broke the ${e.side} zone at ${range}. This zone is no longer active—do not treat the earlier alert as a fresh setup.` };
  }
}

// A preliminary time gate, not an exchange holiday/early-close calendar.
// Live activation must additionally validate against an authoritative session schedule.
export function isRegularWindow(at: string): boolean {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return !["Sat", "Sun"].includes(get("weekday") || "") && minutes >= 570 && minutes < 960;
}

export function parseZoneEvent(value: unknown): ZoneEvent {
  if (!value || typeof value !== "object") throw new Error("Invalid event");
  const e = value as ZoneEvent;
  if (!["SPY", "QQQ"].includes(e.symbol) || ![5, 15].includes(e.timeframe)) throw new Error("Unsupported chart");
  if (!["created", "entered", "exited", "invalidated"].includes(e.kind)) throw new Error("Unsupported event");
  if (!["supply", "demand"].includes(e.side) || !["aligned", "countertrend", "unknown"].includes(e.trend)) throw new Error("Invalid context");
  if (![e.lower, e.upper, e.price].every(n => typeof n === "number" && Number.isFinite(n) && n > 0) || e.lower >= e.upper) throw new Error("Invalid zone prices");
  if (typeof e.id !== "string" || !e.id.trim() || e.id.length > 160 || typeof e.zoneId !== "string" || !e.zoneId.trim() || e.zoneId.length > 160) throw new Error("Missing event identity");
  if (typeof e.at !== "string" || !/Z$|[+-]\d{2}:\d{2}$/.test(e.at) || e.session !== "regular" || !isRegularWindow(e.at)) throw new Error("Outside regular window");
  if (e.kind === "entered" && (e.price < e.lower || e.price > e.upper)) throw new Error("Price is not inside zone");
  if (e.kind === "exited" && e.price >= e.lower && e.price <= e.upper) throw new Error("Price remains inside zone");
  return { ...e };
}

export function applyZoneEvent(zones: LiveZone[], value: unknown): LiveZone[] {
  const e = parseZoneEvent(value);
  if (zones.some(z => z.history.some(h => h.id === e.id))) return zones;
  const existing = zones.find(z => z.event.zoneId === e.zoneId);
  if (!existing) {
    if (e.kind !== "created") throw new Error("Zone creation missing");
    return [{ event: e, status: "active", history: [e] }, ...zones];
  }
  if (e.symbol !== existing.event.symbol || e.timeframe !== existing.event.timeframe || e.side !== existing.event.side || e.lower !== existing.event.lower || e.upper !== existing.event.upper) throw new Error("Zone identity mismatch");
  if (e.kind === "created" || existing.status === "invalidated" || Date.parse(e.at) < Date.parse(existing.event.at)) return zones;
  if ((e.kind === "entered" && existing.status === "inside") || (e.kind === "exited" && existing.status !== "inside")) return zones;
  return zones.map(z => z !== existing ? z : {
    event: e, status: e.kind === "invalidated" ? "invalidated" : e.kind === "entered" ? "inside" : "active", history: [e, ...z.history],
  });
}

export const ZONE_FIXTURE: ZoneEvent = {
  id: "demo-created", zoneId: "demo-spy-5", symbol: "SPY", timeframe: 5,
  kind: "created", side: "demand", lower: 500, upper: 501, price: 502,
  at: "2026-09-18T14:00:00Z", session: "regular", trend: "unknown",
};
