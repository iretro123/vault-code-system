import {act,renderHook,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({userId:'test',statuses:[] as Array<(status:string)=>void>, getSession:vi.fn().mockResolvedValue({data:{session:null},error:null}),handlers:{} as Record<string,(e:{new:Record<string,unknown>})=>void>,limit:vi.fn().mockResolvedValue({data:[],error:null})}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:m.userId},profile:{},userRole:{role:'member'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{
 const query={select:()=>query,eq:()=>query,is:()=>query,order:()=>query,gt:()=>query,limit:m.limit};return query;
},auth:{getSession:m.getSession},realtime:{setAuth:vi.fn()},channel:()=>{const channel={on:(_type:string,filter:{event:string},handler:(e:{new:Record<string,unknown>})=>void)=>{m.handlers[filter.event]=handler;return channel;},subscribe:(callback:(status:string)=>void)=>{m.statuses.push(callback);return channel;}};return channel;},removeChannel:vi.fn().mockResolvedValue('ok')}}));
import {useRoomMessages} from '@/hooks/useRoomMessages';
beforeEach(()=>{m.getSession.mockResolvedValue({data:{session:null},error:null});vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');vi.spyOn(navigator,'onLine','get').mockReturnValue(true);});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.clearAllMocks();m.statuses=[];m.userId='test';});
it('pauses retries while hidden and recovers once on foreground wake',async()=>{
 vi.useFakeTimers();
 const visibility=vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
 renderHook(()=>useRoomMessages('background-retry-test'));
 await act(async()=>{});
 act(()=>m.statuses[0]('CHANNEL_ERROR'));
 act(()=>{visibility.mockReturnValue('hidden');document.dispatchEvent(new Event('visibilitychange'));});
 await act(async()=>{await vi.advanceTimersByTimeAsync(30000);});
 expect(m.statuses).toHaveLength(1);
 await act(async()=>{visibility.mockReturnValue('visible');document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});
 expect(m.statuses).toHaveLength(2);
});
it('applies real messages immediately, deduplicates and keeps thread replies out of the main feed',async()=>{
 const {result}=renderHook(()=>useRoomMessages('realtime-test'));
 await waitFor(()=>expect(result.current.loading).toBe(false));
 const message={id:'one',room_slug:'realtime-test',user_id:'other',body:'Hello',created_at:'2026-09-16T12:00:00Z'};
 act(()=>{m.handlers.INSERT({new:message});m.handlers.INSERT({new:message});m.handlers.INSERT({new:{...message,id:'reply',parent_message_id:'one'}});m.handlers.INSERT({new:{...message,id:'wrong',room_slug:'different'}});});
 expect(result.current.messages.map(row=>row.id)).toEqual(['one']);
 act(()=>m.handlers.UPDATE({new:{...message,body:'Edited',edit_count:1}}));expect(result.current.messages[0].body).toBe('Edited');
 act(()=>m.handlers.UPDATE({new:{...message,is_deleted:true}}));expect(result.current.messages).toHaveLength(0);
});

it('retries a replacement channel that also fails and stops after unmount',async()=>{
 vi.useFakeTimers();
 const {result,unmount}=renderHook(()=>useRoomMessages('retry-test'));
 await act(async()=>{});
 act(()=>m.statuses[0]('CHANNEL_ERROR'));
 await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});
 expect(m.statuses).toHaveLength(2);
 act(()=>m.statuses[1]('TIMED_OUT'));
 await act(async()=>{await vi.advanceTimersByTimeAsync(2000);});
 expect(m.statuses).toHaveLength(3);
 act(()=>m.statuses[2]('SUBSCRIBED'));
 expect(result.current.connection).toBe('connected');
 act(()=>m.statuses[2]('CLOSED'));
 unmount();
 await vi.advanceTimersByTimeAsync(16000);
 expect(m.statuses).toHaveLength(3);
});

it('recovers when refreshing the session rejects during reconnect',async()=>{
 vi.useFakeTimers();
 m.getSession.mockRejectedValueOnce(new Error('Offline'));
 renderHook(()=>useRoomMessages('session-retry-test'));
 await act(async()=>{});
 act(()=>m.statuses[0]('CHANNEL_ERROR'));
 await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});
 expect(m.statuses).toHaveLength(1);
 await act(async()=>{await vi.advanceTimersByTimeAsync(2000);});
 expect(m.statuses).toHaveLength(2);
});

it('cancels pending retries when the existing channel recovers',async()=>{
 vi.useFakeTimers();
 renderHook(()=>useRoomMessages('self-recovery-test'));
 await act(async()=>{});
 act(()=>{m.statuses[0]('CHANNEL_ERROR');m.statuses[0]('SUBSCRIBED');});
 await act(async()=>{await vi.advanceTimersByTimeAsync(16000);});
 expect(m.statuses).toHaveLength(1);
});

it('recovers on network return even when the old socket never reported failure',async()=>{
 vi.useFakeTimers();
 const online=vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
 renderHook(()=>useRoomMessages('offline-retry-test'));
 await act(async()=>{});
 act(()=>m.statuses[0]('SUBSCRIBED'));
 act(()=>{online.mockReturnValue(false);window.dispatchEvent(new Event('offline'));});
 await act(async()=>{await vi.advanceTimersByTimeAsync(30000);});
 expect(m.statuses).toHaveLength(1);
 await act(async()=>{online.mockReturnValue(true);window.dispatchEvent(new Event('online'));});
 expect(m.statuses).toHaveLength(2);
});

it('ignores a removed channel closing after a successful replacement',async()=>{
 vi.useFakeTimers();
 const {result}=renderHook(()=>useRoomMessages('stale-channel-test'));
 await act(async()=>{});
 act(()=>m.statuses[0]('CHANNEL_ERROR'));
 await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});
 act(()=>{m.statuses[1]('SUBSCRIBED');m.statuses[0]('CLOSED');});
 await act(async()=>{await vi.advanceTimersByTimeAsync(16000);});
 expect(m.statuses).toHaveLength(2);
 expect(result.current.connection).toBe('connected');
});

it('does not reuse another account feed or accept its late realtime callback',async()=>{
 const view=renderHook(()=>useRoomMessages('account-scope-test'));
 await waitFor(()=>expect(view.result.current.loading).toBe(false));
 const oldHandler=m.handlers.INSERT;
 const message={id:'private',room_slug:'account-scope-test',user_id:'other',body:'Private feed',created_at:'2026-09-27T12:00:00Z'};
 act(()=>oldHandler({new:message}));
 expect(view.result.current.messages).toHaveLength(1);
 m.userId='second-account';view.rerender();
 await waitFor(()=>expect(view.result.current.loading).toBe(false));
 expect(view.result.current.messages).toHaveLength(0);
 act(()=>oldHandler({new:{...message,id:'late'}}));
 expect(view.result.current.messages).toHaveLength(0);
});
