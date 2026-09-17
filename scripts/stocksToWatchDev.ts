import type { Plugin } from 'vite';
import { createWatchSnapshot, easternParts, refreshSlot, watchFeedSchema, type WatchSnapshot } from '../src/lib/stocksToWatch';
import { fetchStockAnalysis } from './stockAnalysisSource';

// Local-only adapter. Production requires an authenticated backend and durable cache.
export function stocksToWatchDev(): Plugin {
  return { name: 'vault-stocks-to-watch', configureServer(server) {
    const feedUrl = process.env.VAULT_WATCH_FEED_URL;
    let snapshot: WatchSnapshot | null = null;
    let lastSlot: string | null = null;
    let busy = false;
    let failed = false;
    let lastAttempt = 0;
    async function tick(initial = false) {
      const now = new Date();
      const et = easternParts(now);
      const day = new Date(`${et.date}T12:00:00Z`).getUTCDay();
      if (busy || (!initial && (day === 0 || day === 6 || et.minutes < 540 || et.minutes > 960)) || Date.now() - lastAttempt < 60_000) return;
      const tentativeSlot = `${et.date}:${Math.floor((et.minutes - 540) / 30)}`;
      if (tentativeSlot === lastSlot) return;
      busy = true;
      lastAttempt = Date.now();
      try {
        if (!feedUrl) {
          snapshot = await fetchStockAnalysis(now);
          lastSlot = tentativeSlot;
          failed = false;
          return;
        }
        const url = new URL(feedUrl);
        if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('HTTPS feed required');
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'error' });
        if (!response.ok) throw new Error('Feed unavailable');
        const raw = await response.text();
        if (raw.length > 2_000_000) throw new Error('Feed too large');
        const feed = watchFeedSchema.parse(JSON.parse(raw));
        const slot = refreshSlot(now, feed.sessionDate, feed.closeAt);
        if (!slot) { lastSlot = tentativeSlot; return; }
        snapshot = createWatchSnapshot(feed, now);
        lastSlot = slot;
        failed = false;
      } catch { failed = true; } finally { busy = false; }
    }
    const timer = setInterval(() => void tick(), 60_000);
    void tick(true);
    server.httpServer?.once('close', () => clearInterval(timer));
    server.middlewares.use('/api/stocks-to-watch', (req, res) => {
      if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ status: failed ? 'unavailable' : snapshot ? 'ready' : 'waiting', snapshot }));
    });
  } };
}
