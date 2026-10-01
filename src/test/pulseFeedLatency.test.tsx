import {act,cleanup,renderHook} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),status:null as null|((s:string)=>void),removeChannel:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc,removeChannel:mocks.removeChannel,channel:()=>{const c={on:()=>c,subscribe:(cb:(s:string)=>void)=>{mocks.status=cb;return c;}};return c;},auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}})}}}));
import {usePulseFeed} from '@/hooks/usePulseFeed';
const now=Date.parse('2026-09-30T15:00:00Z');
const feed=(posts:unknown[]=[])=>({data:{symbol:'AMEX:SPY',posts:posts.map(p=>({symbol:'AMEX:SPY',...(p as object)})),receivedAt:now,indicatorAt:{},sessionOpen:true},error:null});
async function start(){renderHook(()=>usePulseFeed('cloud',true));await act(async()=>{await vi.dynamicImportSettled();});await act(async()=>mocks.status?.('SUBSCRIBED'));mocks.rpc.mockClear();}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(now);mocks.rpc.mockReset().mockResolvedValue(feed());Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});});
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('Pulse image recovery polling',()=>{
 it('picks up a pending image within three seconds when its realtime change is missed',async()=>{
  mocks.rpc.mockResolvedValue(feed([{id:'event',at:now,captureStatus:'pending'}]));await start();
  mocks.rpc.mockResolvedValue(feed([{id:'event',at:now,chartUrl:'https://example.com/chart.png'}]));
  await act(async()=>vi.advanceTimersByTimeAsync(3000));expect(mocks.rpc).toHaveBeenCalledTimes(1);
  await act(async()=>vi.advanceTimersByTimeAsync(9000));expect(mocks.rpc).toHaveBeenCalledTimes(1);
 });
 it('keeps a healthy idle stream on the thirty-second fallback',async()=>{await start();await act(async()=>vi.advanceTimersByTimeAsync(27000));expect(mocks.rpc).not.toHaveBeenCalled();await act(async()=>vi.advanceTimersByTimeAsync(3000));expect(mocks.rpc).toHaveBeenCalledTimes(1);});
 it('recovers a disconnected stream within six seconds and does not poll a hidden tab',async()=>{await start();await act(async()=>mocks.status?.('CHANNEL_ERROR'));await act(async()=>vi.advanceTimersByTimeAsync(6000));expect(mocks.rpc).toHaveBeenCalledTimes(1);Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});await act(async()=>vi.advanceTimersByTimeAsync(30000));expect(mocks.rpc).toHaveBeenCalledTimes(1);});
 it('backs off repeated feed errors instead of hammering the backend',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{code:'503'}});await start();await act(async()=>vi.advanceTimersByTimeAsync(27000));expect(mocks.rpc).not.toHaveBeenCalled();await act(async()=>vi.advanceTimersByTimeAsync(3000));expect(mocks.rpc).toHaveBeenCalledTimes(1);
 });
 it('does not fast-poll expired pending captures',async()=>{mocks.rpc.mockResolvedValue(feed([{id:'old',at:now-120000,captureStatus:'pending'}]));await start();await act(async()=>vi.advanceTimersByTimeAsync(9000));expect(mocks.rpc).not.toHaveBeenCalled();});
});

it('rejects another symbol response instead of rendering SPY in QQQ',async()=>{
 mocks.rpc.mockResolvedValue(feed([{id:'spy',at:now}]));
 const {result}=renderHook(()=>usePulseFeed('cloud',true,'NASDAQ:QQQ'));
 await act(async()=>{await vi.dynamicImportSettled();});
 expect(mocks.rpc).toHaveBeenCalledWith('pulse_feed_symbol',{p_symbol:'NASDAQ:QQQ'},{get:true});
 expect(result.current.feed.posts).toHaveLength(0);expect(result.current.connected).toBe(false);
});
