import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartNoAxesCombined } from 'lucide-react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { easternParts } from '@/lib/stocksToWatch';
import './stocks-to-watch.css';

const responseSchema = z.object({ status: z.enum(['not_connected', 'unavailable', 'ready', 'waiting']), snapshot: z.object({
  observedAt: z.string().datetime().nullable(), sourceDate: z.string().optional(), session: z.enum(['premarket','regular']).optional(), checkedAt: z.string().datetime(), sourceUrl: z.string().url().refine(s => s.startsWith('https://')),
  items: z.array(z.object({ symbol: z.string(), name: z.string(), detail: z.string(), speculative: z.boolean() })).max(5),
}).nullable() });
const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
export function MarketWatch() {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!open) return; const id = setInterval(() => setNow(Date.now()), 60_000); setNow(Date.now()); return () => clearInterval(id); }, [open]);
  const query = useQuery({ queryKey: ['stocks-to-watch'], enabled: open, refetchInterval: open ? 60_000 : false, retry: 1,
    queryFn: async ({ signal }) => {
      const res = await fetch('/api/stocks-to-watch', { signal });
      if (!res.ok) throw new Error('Watchlist unavailable');
      return responseSchema.parse(await res.json());
    },
  });
  const snapshot = query.data?.snapshot;
  const items = snapshot?.items ?? [];
  const stale = snapshot && (now - Date.parse(snapshot.observedAt ?? snapshot.checkedAt) > 35 * 60_000 || (snapshot.sourceDate && snapshot.sourceDate !== easternParts(new Date(now)).date) || query.isError || query.data?.status !== 'ready');
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button type="button"><ChartNoAxesCombined size={17}/> Stocks to watch</button></DialogTrigger>
    <DialogContent className="market-watch-dialog market-movers-dialog stocks-watch">
      <div className="market-watch-heading"><DialogTitle>Stocks to watch</DialogTitle><DialogDescription>A short list. A simple reason.</DialogDescription></div>
      <p className="stocks-watch-status" role="status">{snapshot ? (stale ? 'Last available list · ' : '') + (snapshot.observedAt ? 'Data as of ' + formatDate(snapshot.observedAt) : 'Source session: ' + snapshot.sourceDate + (snapshot.session === 'premarket' ? ' · Pre-market' : ' · Regular session')) : query.isLoading ? 'Checking the watchlist…' : 'Waiting for the next successful source check.'}</p>
      <ul className="stocks-watch-list">{items.map(item => <li key={item.symbol}><div><strong>{item.symbol}</strong><span>{item.name}</span></div><p>{item.detail}</p></li>)}</ul>
      {snapshot && !items.length && <p>No stocks met the activity filters at this check.</p>}
      <p className="market-watch-footer">{stale ? 'Last available results. ' : ''}Source data may be delayed. Watchlist only—not a buy or sell instruction.</p>
      <div className="stocks-watch-bottom"><span>{snapshot ? 'Checked ' + formatDate(snapshot.checkedAt) : 'Source check pending'}<br/>Every 30 min · 9 a.m.–4 p.m. ET · weekdays</span>{items.length > 0 && <a href={snapshot?.sourceUrl} target="_blank" rel="noopener noreferrer">Stock Analysis ↗</a>}</div>
    </DialogContent>
  </Dialog>;
}
