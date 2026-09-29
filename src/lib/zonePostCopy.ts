import type { BitcoinZonePost } from "./bitcoinZones";

export function zonePostCopy(e: BitcoinZonePost) {
  const demand = e.side === "demand";
  const edge = demand ? "lower" : "upper";
  const closed = e.kind === "broken" || e.kind === "retired";
  const title = e.kind === "entered" ? "Price entered the zone" : e.kind === "broken" ? "Zone broke" : e.kind === "retired" ? "Zone removed" : e.kind === "holding" ? "Reaction at candle close" : "Zone on watch";
  const explanation = `${demand ? "Demand: watch for a bounce." : "Supply: watch for a rejection."} Not an entry signal.`;
  return { title, explanation, points: closed ? [
    "Past update—not a fresh entry.",
    "Check the latest chart.",
    "Removed does not mean broken.",
  ] : [
    `Wait for the ${e.timeframe}-minute candle to finish. Don’t chase.`,
    `Plan a stop beyond the ${edge} edge; keep risk small. Stops can slip.`,
    "Compare potential reward with risk. A 2:1 ratio isn’t a guaranteed win.",
  ] };
}

export function shortZoneSummary(e: BitcoinZonePost) {
  const summaries: Record<string, string> = {
    "visual-btc-15m-demand-baseline-1789840307555": "Demand below price. Watching for a touch.",
    "visual-btc-15m-reaction-1789842234832": "Price touched demand and bounced. Candle not finished yet.",
    "visual-btc-15m-reaction-completed-1789842665212": "Bounce confirmed: candle finished above demand. Reaction delivered—not a trade result.",
  };
  return summaries[e.id] ?? e.summary;
}
