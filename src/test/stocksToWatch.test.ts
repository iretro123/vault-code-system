import { describe, expect, it } from 'vitest';
import { createWatchSnapshot, refreshSlot } from '@/lib/stocksToWatch';
const now = new Date('2026-09-14T14:00:00Z');
const candidate = { symbol:'NVDA', name:'NVIDIA', changePercent:2, dollarVolume:100e6, marketCap:1e12, session:'regular' };
const feed = { sessionDate:'2026-09-14', closeAt:'2026-09-14T20:00:00Z', observedAt:now.toISOString(), sourceUrl:'https://example.com', candidates:[candidate] };
describe('watchlist facts', () => {
  it('writes plain descriptions without invented news', () => { expect(createWatchSnapshot(feed,now).items[0].detail).toBe('Moving up today with active trading.'); });
  it('rejects stale and future data', () => {
    expect(()=>createWatchSnapshot({...feed,observedAt:'2026-09-14T12:00:00Z'},now)).toThrow();
    expect(()=>createWatchSnapshot({...feed,observedAt:'2026-09-14T15:00:00Z'},now)).toThrow();
  });
  it('deduplicates and excludes inactive and wrong-session rows', () => {
    const result=createWatchSnapshot({...feed,candidates:[candidate,candidate,{...candidate,symbol:'LOW',dollarVolume:10},{...candidate,symbol:'PRE',session:'premarket'}]},now);
    expect(result.items.map(r=>r.symbol)).toEqual(['NVDA']);
  });
  it('prioritizes established names and caps the list at five', () => {
    const rows=Array.from({length:8},(_,i)=>({...candidate,symbol:'S'+i}));
    const result=createWatchSnapshot({...feed,candidates:[{...candidate,symbol:'TINY',marketCap:1e6,dollarVolume:1e10},...rows]},now);
    expect(result.items).toHaveLength(5);expect(result.items[0].symbol).toBe('S0');
  });
});
describe('Eastern schedule', () => {
  it('starts at 9 in daylight and standard time', () => {
    expect(refreshSlot(new Date('2026-09-14T13:00:00Z'),'2026-09-14',feed.closeAt)).toBe('2026-09-14:0');
    expect(refreshSlot(new Date('2026-12-14T14:00:00Z'),'2026-12-14','2026-12-14T21:00:00Z')).toBe('2026-12-14:0');
  });
  it('does not schedule closed days or stale calendars', () => {
    expect(refreshSlot(now,feed.sessionDate,null)).toBeNull();
    expect(refreshSlot(now,'2026-09-11',feed.closeAt)).toBeNull();
  });
  it('includes the close and stops after early close', () => {
    expect(refreshSlot(new Date('2026-09-14T20:00:00Z'),feed.sessionDate,feed.closeAt)).toBe('2026-09-14:14');
    expect(refreshSlot(new Date('2026-11-27T18:30:00Z'),'2026-11-27','2026-11-27T18:00:00Z')).toBeNull();
  });
});
