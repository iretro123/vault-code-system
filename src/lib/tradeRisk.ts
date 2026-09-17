/** Educational sizing estimates. No orders, quotes, or account access. */
export type Market = "options" | "futures" | "forex";
export const FUTURES = {
  MES: { name: "MES · Micro S&P 500", tick: 0.25, value: 1.25 },
  MNQ: { name: "MNQ · Micro Nasdaq", tick: 0.25, value: 0.5 },
  ES: { name: "ES · E-mini S&P 500", tick: 0.25, value: 12.5 },
  NQ: { name: "NQ · E-mini Nasdaq", tick: 0.25, value: 5 },
} as const;
export const PAIRS = ["EUR/USD", "GBP/USD", "AUD/USD", "NZD/USD", "USD/JPY", "USD/CAD", "USD/CHF", "EUR/JPY", "EUR/GBP"] as const;
export type Plan = {
  date: string; example: boolean; balance: string; daily: string; percent: string; maxLosses: string;
  lost: string; losses: string; reserved: string; prop: boolean; floor: string; buffer: string;
  firmRoom: string; firmCap: string; trail: string; entry: string; stop: string; fees: string;
  allowance: string; cash: string; premiumCap: string; optionBasis: string; optionSide: string;
  future: keyof typeof FUTURES; distance: string; freeMargin: string; margin: string;
  pair: string; conversion: string; lotStep: string; minLot: string;
};
export const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
export const blankPlan = (): Plan => ({
  date: localDay(), example: false, balance: "", daily: "", percent: "", maxLosses: "", lost: "0", losses: "0", reserved: "0",
  prop: false, floor: "", buffer: "", firmRoom: "", firmCap: "", trail: "eod",
  entry: "", stop: "", fees: "", allowance: "", cash: "", premiumCap: "", optionBasis: "premium", optionSide: "call",
  future: "MES", distance: "", freeMargin: "", margin: "", pair: "EUR/USD", conversion: "", lotStep: "0.01", minLot: "0.01",
});
export function examplePlan(market: Market, prop = false): Plan {
  return { ...blankPlan(), example: true, prop, balance: prop ? "50000" : "10000", daily: "100", percent: prop ? "5" : "0.5", maxLosses: "2",
    floor: "48000", buffer: "500", firmRoom: "750", firmCap: "5", entry: "0.40", stop: "0.25", fees: market === "forex" ? "7" : "2",
    allowance: market === "options" ? "0.03" : "1", cash: "1000", premiumCap: "200", distance: market === "forex" ? "20" : "5",
    freeMargin: "1000", margin: market === "forex" ? "4000" : "100" };
}
export type RiskResult = { errors: string[]; warnings: string[]; basis: number; daily: number; remaining: number; budget: number;
  quantity: number; unit: string; unitRisk: number; planned: number; fullPremium: number | null; capital: number; pipValue: number | null; ticks: number | null };
export function calculateRisk(market: Market, p: Plan): RiskResult {
  const r: RiskResult = { errors: [], warnings: [], basis: 0, daily: 0, remaining: 0, budget: 0, quantity: 0, unit: market === "forex" ? "lots" : "contracts", unitRisk: 0, planned: 0, fullPremium: null, capital: 0, pipValue: null, ticks: null };
  const read = (key: keyof Plan, name: string, min = 0, positive = false) => {
    const raw = String(p[key]); const n = Number(raw);
    if (!raw.trim() || !Number.isFinite(n) || n < min || (positive && n <= 0) || Math.abs(n) > 1e12) { r.errors.push(`Enter a valid ${name}.`); return 0; }
    return n;
  };
  const integer = (key: keyof Plan, name: string, min: number) => { const n = read(key, name, min); if (!Number.isInteger(n)) r.errors.push(`${name} must be a whole number.`); return n; };
  const prop = market === "futures" && p.prop;
  const balance = read("balance", prop ? "current equity" : "account balance", prop ? -1e12 : 0, !prop);
  const day = read("daily", "daily loss budget", 0, true);
  const percent = read("percent", "risk percentage", 0, true);
  if (percent > 100) r.errors.push("Risk percentage cannot exceed 100%.");
  const maxLosses = integer("maxLosses", "loss limit", 1);
  const lost = read("lost", "losses in dollars"); const losses = integer("losses", "losing trades", 0);
  const reserved = read("reserved", "open-position risk");
  let firmRoom = Infinity;
  r.basis = balance;
  if (prop) {
    const floor = read("floor", "firm liquidation floor", -1e12);
    const buffer = read("buffer", "drawdown buffer", 0, true);
    r.basis = Math.max(0, balance - floor - buffer);
    firmRoom = read("firmRoom", "firm daily room remaining");
    if (r.basis <= 0) r.warnings.push("No drawdown room remains above your buffer. Stop trading this account.");
    r.warnings.push("Prop limits are a manual snapshot, not firm approval. Refresh equity, floor and daily room before every trade; intraday trailing floors can move with open profits.");
  }
  r.daily = Math.max(0, Math.min(day, r.basis));
  // Gross losing-trade costs only: profits do not replenish this daily budget.
  r.remaining = Math.max(0, Math.min(r.daily - lost - reserved, prop ? r.basis - reserved : Infinity, firmRoom - reserved));
  r.budget = Math.max(0, Math.min(r.basis * percent / 100, r.daily / (maxLosses || 1), r.remaining));
  if (losses >= maxLosses && maxLosses > 0) { r.budget = 0; r.warnings.push("Your losing-trade limit is reached. No new risk today."); }
  if (r.remaining <= 0 && day > 0) r.warnings.push("Your available daily risk is used up. No new risk today.");
  if (percent > 2 && !prop) r.warnings.push("This setting risks more than 2% of account balance per trade before other caps. Smaller risk still does not make a strategy profitable.");
  const fees = read("fees", "round-trip fees");
  let cap = Infinity; let step = 1; let minimum = 1; let capitalPerUnit = 0;
  if (market === "options") {
    const entry = read("entry", "option entry premium", 0, true);
    const cash = read("cash", "available settled cash");
    const premiumCap = read("premiumCap", "total premium cap");
    capitalPerUnit = entry * 100 + fees;
    cap = capitalPerUnit > 0 ? Math.min(cash, premiumCap) / capitalPerUnit : 0;
    if (p.optionBasis === "stop") {
      const stop = read("stop", "option stop premium"); const slip = read("allowance", "premium slippage allowance");
      if (stop >= entry) r.errors.push("A long option's stop premium must be below its entry premium.");
      r.unitRisk = Math.min(entry, Math.max(0, entry - stop) + slip) * 100 + fees;
      r.warnings.push("Stop-based sizing is not a maximum-loss guarantee. The entire premium can be lost; spreads, time decay and volatility can move the option independently of the stock.");
    } else r.unitRisk = capitalPerUnit;
    r.warnings.push("Standard 100-share long calls/puts only. No short options, spreads, adjusted contracts or exercise/assignment exposure. Close before expiration if you do not intend exercise.");
  } else if (market === "futures") {
    const spec = FUTURES[p.future];
    if (!Object.prototype.hasOwnProperty.call(FUTURES, p.future)) { r.errors.push("Choose a supported futures contract."); return r; }
    const distance = read("distance", "stop distance in index points", 0, true);
    const slip = integer("allowance", "slippage ticks", 0);
    r.ticks = Math.ceil(distance / spec.tick - 1e-10);
    r.unitRisk = (r.ticks + slip) * spec.value + fees;
    if (prop) cap = integer("firmCap", "remaining contract allowance", 0);
    else { const free = read("freeMargin", "available margin"); capitalPerUnit = read("margin", "margin per contract", 0, true); cap = capitalPerUnit > 0 ? free / (capitalPerUnit + fees) : 0; }
    r.warnings.push("Futures stops may slip or fail to execute. Loss can exceed this estimate and your deposit. Margin is buying power, not a loss limit; broker requirements may change.");
  } else {
    if (!PAIRS.includes(p.pair as typeof PAIRS[number])) r.errors.push("Choose a supported currency pair.");
    const quote = p.pair.split("/")[1];
    const conversion = quote === "USD" ? 1 : read("conversion", `${quote}-to-USD conversion rate`, 0, true);
    const pip = quote === "JPY" ? 0.01 : 0.0001;
    r.pipValue = pip * 100000 * conversion;
    const stop = read("distance", "stop distance in pips", 0, true); const allowance = read("allowance", "spread/slippage allowance");
    r.unitRisk = (stop + allowance) * r.pipValue + fees;
    step = read("lotStep", "broker lot increment", 0, true); minimum = read("minLot", "broker minimum lot", 0, true);
    if (step > 1 || step < 0.00001) r.errors.push("Lot increment must be between 0.00001 and 1 standard lot.");
    const free = read("freeMargin", "available margin"); capitalPerUnit = read("margin", "margin per standard lot", 0, true);
    cap = capitalPerUnit > 0 ? free / (capitalPerUnit + fees) : 0;
    r.warnings.push("USD accounts and spot forex pairs only; not gold, CFDs or futures. Conversion and margin inputs are manual, not live. Gaps, financing and rate changes can increase losses.");
  }
  if (r.errors.length) { r.budget = 0; return r; }
  const raw = r.unitRisk > 0 ? Math.min(r.budget / r.unitRisk, cap) : 0;
  if (!Number.isFinite(raw) || raw > Number.MAX_SAFE_INTEGER) {
    r.errors.push("These inputs exceed the supported sizing range. Check prices, margin and costs."); r.budget = 0; return r;
  }
  r.quantity = step > 0 ? Number((Math.floor((raw + 1e-10) / step) * step).toFixed(5)) : 0;
  // A final conservative check guards floating-point boundary rounding.
  if (r.quantity * r.unitRisk > r.budget + 1e-8 || r.quantity > cap + 1e-8) r.quantity = Math.max(0, Number((r.quantity - step).toFixed(5)));
  if (r.quantity < minimum - 1e-10) r.quantity = 0;
  r.planned = r.quantity * r.unitRisk; r.capital = r.quantity * capitalPerUnit;
  if (market === "options") r.fullPremium = r.capital;
  if (r.quantity === 0 && r.budget > 0) r.warnings.unshift("The minimum tradable size does not fit your risk or funding limits. Skip this setup; do not tighten a valid stop just to fit more size.");
  return r;
}
