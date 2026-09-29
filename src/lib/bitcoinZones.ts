export interface BitcoinZonePost {
  id: string; zoneId: string; symbol: "COINBASE:BTCUSD"; timeframe: 5 | 15;
  kind: "created" | "entered" | "holding" | "broken" | "retired" | "observed";
  source?: "visual-review";
  summary?: string;
  side: "demand" | "supply"; lower: number; upper: number; price: number;
  at: number; confirmed: boolean; trend: "aligned" | "countertrend" | "unknown";
  chartUrl?: string;
  capturedAt?: number;
  captureStatus?: "pending" | "ready" | "failed";
}

export function parseBitcoinZone(value: unknown): BitcoinZonePost {
  if (!value || typeof value !== "object") throw new Error("Invalid event");
  const e = value as BitcoinZonePost;
  if (e.symbol !== "COINBASE:BTCUSD" || ![5, 15].includes(e.timeframe)) throw new Error("Bitcoin 5m/15m only");
  if (!["created", "entered", "holding", "broken", "retired"].includes(e.kind) || !["supply", "demand"].includes(e.side)) throw new Error("Invalid zone event");
  if (!["aligned", "countertrend", "unknown"].includes(e.trend) || typeof e.confirmed !== "boolean") throw new Error("Invalid context");
  if (![e.lower, e.upper, e.price, e.at].every(n => typeof n === "number" && Number.isFinite(n) && n > 0) || e.lower >= e.upper) throw new Error("Invalid prices/time");
  if (![e.id, e.zoneId].every(s => typeof s === "string" && /^[a-zA-Z0-9:_-]{1,180}$/.test(s))) throw new Error("Invalid identity");
  if (e.kind === "entered" && (e.price < e.lower || e.price > e.upper)) throw new Error("Not inside zone");
  if (e.kind === "holding" && (!e.confirmed || (e.side === "demand" ? e.price < e.lower : e.price > e.upper))) throw new Error("Unconfirmed hold");
  if (e.kind === "broken" && (!e.confirmed || !(e.side === "demand" ? e.price < e.lower : e.price > e.upper))) throw new Error("Unconfirmed break");
  // Images are attached by the capture service, never accepted from webhook input.
  const {id, zoneId, symbol, timeframe, kind, side, lower, upper, price, at, confirmed, trend} = e;
  return {id, zoneId, symbol, timeframe, kind, side, lower, upper, price, at, confirmed, trend};
}

export function appendBitcoinZone(posts: BitcoinZonePost[], input: unknown): BitcoinZonePost[] {
  const e = parseBitcoinZone(input);
  if (posts.some(p => p.id === e.id)) return posts;
  const previous = posts.filter(p => p.zoneId === e.zoneId);
  const last = previous.at(-1);
  if (!last && e.kind !== "created") throw new Error("Creation missing");
  if (last && (last.timeframe !== e.timeframe || last.side !== e.side || last.lower !== e.lower || last.upper !== e.upper)) throw new Error("Zone identity changed");
  if (last && (["broken", "retired"].includes(last.kind) || e.at < last.at || e.kind === "created")) return posts;
  if (e.kind === "holding" && !previous.some(p => p.kind === "entered")) throw new Error("Touch missing");
  return [...posts, e];
}
