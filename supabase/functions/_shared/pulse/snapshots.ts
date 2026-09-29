import { PULSE_SYMBOL, pulseWindowOpen, validatePulsePost, appendPulsePost, type PulseCandle, type PulseKind, type PulsePost } from "./domain.ts";

export interface PulseZone { zoneId: string; side: "supply" | "demand"; lower: number; upper: number }
export interface PulseSnapshot {
  kind: "snapshot"; source: "indicator"; symbol: typeof PULSE_SYMBOL;
  timeframe: 5 | 15; at: number; barAt: number; confirmed: boolean;
  price: number; zones: PulseZone[]; bars: PulseCandle[];
}
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const inside = (p: number, z: PulseZone) => p >= z.lower && p <= z.upper;
const beyond = (p: number, z: PulseZone) => z.side === "supply" ? p > z.upper : p < z.lower;
const sessionClose = (s: PulseSnapshot) => s.confirmed === true && positive(s.barAt) && pulseWindowOpen(s.barAt) && Math.abs(s.at - s.barAt - s.timeframe * 60000) <= 5000;

export function validatePulseSnapshot(input: unknown, now: number, afterHoursTest = false): PulseSnapshot {
  if (!input || typeof input !== "object") throw new Error("Invalid snapshot");
  const s = input as PulseSnapshot;
  if (s.kind !== "snapshot" || s.source !== "indicator" || s.symbol !== PULSE_SYMBOL || ![5, 15].includes(s.timeframe)) throw new Error("Wrong chart");
  if (!positive(s.at) || s.at > now + 5000 || now - s.at > 60000) throw new Error("Stale snapshot");
  if (!afterHoursTest && !sessionClose(s) && (!pulseWindowOpen(now) || !pulseWindowOpen(s.at))) throw new Error("Outside monitoring hours");
  if (!positive(s.price) || typeof s.confirmed !== "boolean" || !positive(s.barAt) || s.barAt > s.at || s.at - s.barAt > s.timeframe * 60000 + 5000) throw new Error("Invalid candle time");
  if (s.confirmed && s.at < s.barAt + s.timeframe * 60000 - 1000) throw new Error("Candle still open");
  if (!Array.isArray(s.zones) || s.zones.length > 2 || new Set(s.zones.map(z => z.side)).size !== s.zones.length) throw new Error("Invalid zones");
  const zones = s.zones.map(z => {
    if (!z || typeof z.zoneId !== "string" || !/^[a-zA-Z0-9:_-]{1,100}$/.test(z.zoneId) || !["supply", "demand"].includes(z.side) || !positive(z.lower) || !positive(z.upper) || z.lower >= z.upper) throw new Error("Invalid zone");
    return { zoneId: z.zoneId, side: z.side, lower: z.lower, upper: z.upper };
  });
  if (!Array.isArray(s.bars) || s.bars.length < 2 || s.bars.length > 60) throw new Error("Invalid chart candles");
  const bars = s.bars.map((b, i) => {
    if (!b || ![b.t, b.o, b.h, b.l, b.c].every(positive) || b.h < Math.max(b.o, b.c) || b.l > Math.min(b.o, b.c) || b.h < b.l || b.t > s.barAt || (i > 0 && b.t <= s.bars[i - 1].t)) throw new Error("Invalid chart candle");
    return { t: b.t, o: b.o, h: b.h, l: b.l, c: b.c };
  });
  if (bars.at(-1)!.t !== s.barAt || Math.abs(bars.at(-1)!.c - s.price) > 0.000001) throw new Error("Chart price mismatch");
  return { kind: "snapshot", source: "indicator", symbol: PULSE_SYMBOL, timeframe: s.timeframe, at: s.at, barAt: s.barAt, confirmed: s.confirmed, price: s.price, zones, bars };
}

// The indicator provides the zones. This only describes changes to those exact zones.
export function postsFromSnapshot(posts: PulsePost[], s: PulseSnapshot, now: number, afterHoursTest = false): PulsePost[] {
  let result = posts;
  const latest = new Map<string, PulsePost>();
  for (const p of posts) if (p.source === "indicator" && p.timeframe === s.timeframe) latest.set(p.zoneId, p);
  const emit = (z: PulseZone, kind: PulseKind, price = s.price, confirmed = s.confirmed, barAt = s.barAt) => {
    const validated = validatePulsePost({ id: `${z.zoneId}:${barAt}:${kind}`, ...z, kind, symbol: s.symbol, timeframe: s.timeframe, source: "indicator", price, confirmed, at: s.at }, now, false, afterHoursTest, sessionClose(s));
    result = appendPulsePost(result, { ...validated, barAt, ...(confirmed ? { closedAt: barAt + s.timeframe * 60000 } : {}), bars: s.bars.filter(b => b.t <= barAt) });
  };
  for (const previous of latest.values()) {
    if (["broken", "retired"].includes(previous.kind)) continue;
    const z: PulseZone = { zoneId: previous.zoneId, side: previous.side, lower: previous.lower!, upper: previous.upper! };
    const current = s.zones.find(candidate => candidate.zoneId === z.zoneId);
    if (current && (current.side !== z.side || current.lower !== z.lower || current.upper !== z.upper)) throw new Error("Zone identity changed");
    // A later snapshot can still report a closed-bar break missed between deliveries.
    const missedClose = s.bars.find(b => b.t < s.barAt && b.t + s.timeframe * 60000 > previous.at && beyond(b.c, z));
    if (missedClose) { emit(z, "broken", missedClose.c, true, missedClose.t); continue; }
    if (beyond(s.price, z)) {
      if (s.confirmed) emit(z, "broken");
      else if (previous.kind !== "breached") emit(z, "breached");
    } else if (!current) {
      // Disappearance while a bar forms can roll back. It is not proof of a break.
      if (s.confirmed) emit(z, "retired");
    } else if (previous.kind === "breached") emit(z, "returned");
    else if (inside(s.price, z) && !inside(previous.price!, z)) emit(z, "entered");
    else if (!inside(s.price, z) && inside(previous.price!, z)) emit(z, "exited");
    else if (inside(s.price, z) && s.confirmed && previous.barAt !== s.barAt) emit(z, "holding");
  }
  for (const z of s.zones) if (!latest.has(z.zoneId)) emit(z, "observed");
  return result;
}
