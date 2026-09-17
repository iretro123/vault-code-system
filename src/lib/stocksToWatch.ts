import { z } from 'zod';

export const watchFeedSchema = z.object({
  // Provider must supply today's exchange calendar, including holidays/early closes.
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  closeAt: z.string().datetime().nullable(),
  observedAt: z.string().datetime(),
  sourceUrl: z.string().url().refine(url => url.startsWith('https://')),
  candidates: z.array(z.object({
    symbol: z.string().regex(/^[A-Z][A-Z0-9.-]{0,9}$/),
    name: z.string().min(1).max(100),
    changePercent: z.number().finite(),
    dollarVolume: z.number().finite().nonnegative(),
    marketCap: z.number().finite().nonnegative(),
    session: z.enum(['premarket', 'regular']),
  })).max(2000),
});
export type WatchItem = { symbol: string; name: string; detail: string; speculative: boolean };
export type WatchSnapshot = { observedAt: string | null; sourceDate?: string; session?: 'premarket' | 'regular'; checkedAt: string; sourceUrl: string; items: WatchItem[] };
export function easternParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}
export function refreshSlot(now: Date, sessionDate: string, closeAt: string | null) {
  const et = easternParts(now);
  if (!closeAt || et.date !== sessionDate || et.minutes < 540 || et.minutes > 960) return null;
  const close = new Date(closeAt).getTime();
  // Include the close update; allow a one-minute scheduler delay.
  if (!Number.isFinite(close) || now.getTime() > close + 60_000) return null;
  return `${et.date}:${Math.floor((et.minutes - 540) / 30)}`;
}
export function createWatchSnapshot(input: unknown, now = new Date()): WatchSnapshot {
  const feed = watchFeedSchema.parse(input);
  const age = now.getTime() - Date.parse(feed.observedAt);
  if (age < -60_000 || age > 10 * 60_000 || easternParts(new Date(feed.observedAt)).date !== feed.sessionDate) throw new Error('Source data is stale or has an invalid timestamp');
  const expectedSession = easternParts(now).minutes < 570 ? 'premarket' : 'regular';
  const seen = new Set<string>();
  const candidates = feed.candidates.filter(row => row.session === expectedSession && Math.abs(row.changePercent) >= 1 && row.dollarVolume >= 10_000_000);
  // Established, actively traded companies first; then the largest dollar-volume movers.
  candidates.sort((a, b) => Number(b.marketCap >= 2e9) - Number(a.marketCap >= 2e9) || b.dollarVolume - a.dollarVolume);
  const items: WatchItem[] = [];
  for (const row of candidates) {
    if (seen.has(row.symbol)) continue;
    seen.add(row.symbol);
    const speculative = row.marketCap < 2e9;
    const direction = row.changePercent > 0 ? 'Moving up' : 'Moving down';
    items.push({ symbol: row.symbol, name: row.name, speculative, detail: `${direction}${row.session === 'premarket' ? ' before the open' : ' today'} with active trading.${speculative ? ' Smaller company; extra caution.' : ''}` });
    if (items.length === 5) break;
  }
  return { observedAt: feed.observedAt, checkedAt: now.toISOString(), sourceUrl: feed.sourceUrl, items };
}
