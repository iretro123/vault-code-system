export const PULSE_SYMBOL = "CAPITALCOM:SPX500" as const;
export const PULSE_INDICATOR = "Vault Trading Academy - Supply And Demand";
export type PulseKind = "observed" | "entered" | "holding" | "exited" | "breached" | "returned" | "broken" | "retired";
export interface PulseCandle { t: number; o: number; h: number; l: number; c: number }
export interface PulsePost {
  id: string;
  zoneId: string;
  symbol: typeof PULSE_SYMBOL;
  timeframe: 5 | 15;
  side: "supply" | "demand";
  kind: PulseKind;
  source: "chart-review" | "indicator";
  at: number;
  summary?: string;
  lower?: number;
  upper?: number;
  levelsSource?: "indicator-labels";
  price?: number;
  confirmed?: boolean;
  chartUrl?: string;
  capturedAt?: number;
  afterHoursTest?: boolean;
  barAt?: number;
  bars?: PulseCandle[];
  closedAt?: number;
}
export interface PulseFeed {
  posts: PulsePost[];
  receivedAt: number | null;
  indicatorAt: Partial<Record<5 | 15, number>>;
  sessionOpen: boolean;
  afterHoursTestUntil?: number | null;
  quotes?: Partial<Record<5 | 15, { price: number; at: number; zones: { side: "supply" | "demand"; lower: number; upper: number }[] }>>;
}

// The owner's requested monitoring window. This is not an exchange calendar.
export function pulseWindowOpen(now: number): boolean {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  const minute = Number(part("hour")) * 60 + Number(part("minute"));
  return !["Sat", "Sun"].includes(part("weekday") || "") && minute >= 540 && minute < 960;
}

export function validatePulsePost(input: unknown, now: number, reviewAllowed = false, afterHoursTest = false, verifiedSessionClose = false): PulsePost {
  if (!input || typeof input !== "object") throw new Error("Invalid event");
  const p = input as PulsePost;
  if (p.symbol !== PULSE_SYMBOL || ![5, 15].includes(p.timeframe)) throw new Error("Wrong chart");
  if (![p.id, p.zoneId].every(s => typeof s === "string" && /^[a-zA-Z0-9:_-]{1,160}$/.test(s))) throw new Error("Invalid identity");
  if (!["supply", "demand"].includes(p.side) || !["observed", "entered", "holding", "exited", "breached", "returned", "broken", "retired"].includes(p.kind)) throw new Error("Invalid event kind");
  if (!Number.isFinite(p.at) || p.at > now + 5000 || now - p.at > 300000) throw new Error("Stale or future event");
  if (p.source === "chart-review") {
    if (!reviewAllowed || !["observed", "broken"].includes(p.kind) || typeof p.summary !== "string" || !p.summary.trim() || p.summary.length > 160) throw new Error("Invalid chart review");
    if (p.levelsSource !== undefined && (p.levelsSource !== "indicator-labels" || ![p.lower, p.upper].every(v => typeof v === "number" && Number.isFinite(v) && v > 0) || p.lower! >= p.upper!)) throw new Error("Invalid reviewed boundaries");
    if (p.kind === "broken" && (p.levelsSource !== "indicator-labels" || !Number.isFinite(p.price) || p.confirmed !== true || !(p.side === "supply" ? p.price! > p.upper! : p.price! < p.lower!))) throw new Error("Unconfirmed reviewed break");
  } else if (p.source === "indicator") {
    if (!afterHoursTest && !verifiedSessionClose && (!pulseWindowOpen(p.at) || !pulseWindowOpen(now))) throw new Error("Outside monitoring hours");
    if (![p.lower, p.upper, p.price].every(v => typeof v === "number" && Number.isFinite(v) && v > 0) || p.lower! >= p.upper! || typeof p.confirmed !== "boolean") throw new Error("Invalid prices");
    const inside = p.price! >= p.lower! && p.price! <= p.upper!;
    const beyond = p.side === "demand" ? p.price! < p.lower! : p.price! > p.upper!;
    if (p.kind === "breached" && (!beyond || p.confirmed)) throw new Error("Invalid unconfirmed crossing");
    if (p.kind === "returned" && beyond) throw new Error("Still beyond zone");
    if ((p.kind === "entered" || p.kind === "holding") && !inside) throw new Error("Not inside zone");
    if (p.kind === "holding" && !p.confirmed) throw new Error("Unconfirmed hold");
    if (p.kind === "exited" && inside) throw new Error("Still inside zone");
    if (p.kind === "broken" && (!p.confirmed || !(p.side === "demand" ? p.price! < p.lower! : p.price! > p.upper!))) throw new Error("Unconfirmed break");
  } else throw new Error("Invalid source");
  // Never trust an incoming URL or a client-provided capture timestamp.
  return { id: p.id, zoneId: p.zoneId, symbol: PULSE_SYMBOL, timeframe: p.timeframe, side: p.side, kind: p.kind, source: p.source, at: p.at,
    ...(p.source === "chart-review" ? { summary: p.summary!.trim(), afterHoursTest: !pulseWindowOpen(p.at), ...(p.levelsSource === "indicator-labels" ? { lower: p.lower, upper: p.upper, levelsSource: p.levelsSource } : {}), ...(p.kind === "broken" ? { price: p.price, confirmed: true } : {}) } : { lower: p.lower, upper: p.upper, price: p.price, confirmed: p.confirmed, ...(afterHoursTest && !pulseWindowOpen(p.at) ? { afterHoursTest: true } : {}) }) };
}

export function appendPulsePost(posts: PulsePost[], p: PulsePost): PulsePost[] {
  if (posts.some(old => old.id === p.id)) return posts;
  const previous = posts.filter(old => old.zoneId === p.zoneId);
  const last = previous.at(-1);
  if (last && (last.symbol !== p.symbol || last.timeframe !== p.timeframe || last.side !== p.side || last.source !== p.source || (p.source === "indicator" && (last.lower !== p.lower || last.upper !== p.upper)))) throw new Error("Zone identity changed");
  if (last && p.at <= last.at) throw new Error("Out-of-order event");
  if (last && ["broken", "retired"].includes(last.kind)) throw new Error("Zone already closed");
  if (p.source === "indicator") {
    if (!last && p.kind !== "observed") throw new Error("Zone baseline missing");
    if (last && p.kind === "observed") return posts;
    const inside = last && last.price !== undefined && last.price >= last.lower! && last.price <= last.upper!;
    if (p.kind === "returned" && last?.kind !== "breached") throw new Error("Crossing missing");
    if (p.kind === "breached" && last?.kind === "breached") return posts;
    if (p.kind === "entered" && inside) return posts;
    if ((p.kind === "holding" || p.kind === "exited") && !inside) throw new Error("Zone entry missing");
    if (p.kind === "holding" && (p.barAt !== undefined && last!.barAt !== undefined ? p.barAt === last!.barAt : Math.floor(p.at / (p.timeframe * 60000)) === Math.floor(last!.at / (p.timeframe * 60000)))) return posts;
  }
  return [...posts, p];
}

export function pulseHeadline(p: PulsePost): string {
  if (p.source === "chart-review") return p.summary || "Chart checked.";
  const boundary = (p.side === "supply" ? p.upper : p.lower)?.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const direction = p.side === "supply" ? "above" : "below";
  switch (p.kind) {
    case "observed": return p.price! >= p.lower! && p.price! <= p.upper! ? `In ${p.timeframe}m ${p.side}.` : `${p.timeframe}m ${p.side} on watch.`;
    case "entered": return `In ${p.timeframe}m ${p.side}.`;
    case "holding": return `Still in ${p.timeframe}m ${p.side}.`;
    case "exited": return `Left ${p.timeframe}m ${p.side}.`;
    case "breached": return `Price ${direction} ${boundary}. Waiting for the ${p.timeframe}m close.`;
    case "returned": return `Back ${p.side === "supply" ? "below" : "above"} ${boundary}. ${p.timeframe}m ${p.side} still holding.`;
    case "broken": return `${p.timeframe}m ${p.side} broke. Closed ${direction} ${boundary}.`;
    case "retired": return `${p.timeframe}m ${p.side} removed from the chart.`;
  }
}

export function pulseAge(at: number | null | undefined, now: number): string {
  if (!at) return "Awaiting first check";
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
