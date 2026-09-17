import { easternParts, type WatchSnapshot } from '../src/lib/stocksToWatch';

const clean = (text: string) => text.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
const number = (text: string) => {
  const match = text.replace(/[,\s%$]/g, '').match(/^(-?\d+(?:\.\d+)?)([KMBT])?$/);
  return match ? Number(match[1]) * ({ K:1e3, M:1e6, B:1e9, T:1e12 }[match[2]] ?? 1) : NaN;
};
export function parseStockAnalysis(html: string, premarket: boolean, now: Date): WatchSnapshot {
  const dateMatch = html.match(/Stock Indexes - ([A-Z][a-z]{2} \d{1,2}, \d{4})/);
  if (!dateMatch) throw new Error('Source date missing');
  const date = new Date(dateMatch[1] + ' 12:00:00 GMT');
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid source date');
  const sourceDate = date.toISOString().slice(0,10);
  const today = easternParts(now).date;
  if (sourceDate > today || Date.parse(today) - Date.parse(sourceDate) > 7*86400000) throw new Error('Source date out of range');
  const table = html.match(/<table\b[^>]*id="main-table"[\s\S]*?<\/table>/)?.[0];
  if (!table) throw new Error('Movers table missing');
  const headers = [...table.matchAll(/<th\b[^>]*id="([^"]+)"/g)].map(m=>m[1]);
  const keys = premarket ? ['s','n','premarketChangePercent','premarketPrice','premarketVolume','marketCap'] : ['s','n','change','price','volume','marketCap'];
  if (keys.some(key=>!headers.includes(key))) throw new Error('Source columns changed');
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].flatMap(match=> {
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m=>clean(m[1]));
    if (!cells.length) return [];
    const [symbol,name,change,price,volume,cap] = keys.map(key=>cells[headers.indexOf(key)] ?? '');
    const values = [change,price,volume,cap].map(number);
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol) || !name || values.some(v=>!Number.isFinite(v))) return [];
    return [{symbol,name,change:values[0],price:values[1],volume:values[2],cap:values[3]}];
  });
  if (!rows.length) throw new Error('No readable source rows');
  const eligible = rows.filter(r=>r.price >= 1 && Math.abs(r.change)>=1 && r.volume >= (premarket ? 100000 : 1000000));
  eligible.sort((a,b)=>Number(b.cap>=2e9)-Number(a.cap>=2e9) || b.volume*b.price-a.volume*a.price);
  const unique = [...new Map(eligible.map(r=>[r.symbol,r])).values()].slice(0,5);
  return {
    observedAt: null, sourceDate, session: premarket ? 'premarket' : 'regular', checkedAt:now.toISOString(),
    sourceUrl: 'https://stockanalysis.com/markets/' + (premarket ? 'premarket/' : 'active/'),
    items:unique.map(r=>({symbol:r.symbol,name:r.name,speculative:r.cap<2e9,detail:(r.change>0?'Moved up':'Moved down')+(premarket?' before the open.':' in the session; among the most-traded stocks.')+(r.cap<2e9?' Smaller company; extra caution.':'')})),
  };
}
export async function fetchStockAnalysis(now = new Date()) {
  const premarket = easternParts(now).minutes >= 540 && easternParts(now).minutes < 570;
  const url = 'https://stockanalysis.com/markets/' + (premarket ? 'premarket/' : 'active/');
  const response = await fetch(url, { headers:{'User-Agent':'VaultWatch/1.0'}, signal:AbortSignal.timeout(15000), redirect:'error' });
  if (!response.ok) throw new Error('Public source unavailable');
  const html = await response.text();
  if (html.length>3_000_000) throw new Error('Unexpected source size');
  return parseStockAnalysis(html,premarket,now);
}
