import {act,renderHook,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
const m=vi.hoisted(()=>({handlers:{} as Record<string,(e:{new:Record<string,unknown>})=>void>,limit:vi.fn().mockResolvedValue({data:[],error:null})}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'test'},profile:{},userRole:{role:'member'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{
 const query={select:()=>query,eq:()=>query,is:()=>query,order:()=>query,gt:()=>query,limit:m.limit};return query;
},channel:()=>{const channel={on:(_type:string,filter:{event:string},handler:(e:{new:Record<string,unknown>})=>void)=>{m.handlers[filter.event]=handler;return channel;},subscribe:()=>channel};return channel;},removeChannel:vi.fn()}}));
import {useRoomMessages} from '@/hooks/useRoomMessages';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('applies real messages immediately, deduplicates and keeps thread replies out of the main feed',async()=>{
 const {result}=renderHook(()=>useRoomMessages('realtime-test'));
 await waitFor(()=>expect(result.current.loading).toBe(false));
 const message={id:'one',room_slug:'realtime-test',user_id:'other',body:'Hello',created_at:'2026-09-16T12:00:00Z'};
 act(()=>{m.handlers.INSERT({new:message});m.handlers.INSERT({new:message});m.handlers.INSERT({new:{...message,id:'reply',parent_message_id:'one'}});m.handlers.INSERT({new:{...message,id:'wrong',room_slug:'different'}});});
 expect(result.current.messages.map(row=>row.id)).toEqual(['one']);
 act(()=>m.handlers.UPDATE({new:{...message,body:'Edited',edit_count:1}}));expect(result.current.messages[0].body).toBe('Edited');
 act(()=>m.handlers.UPDATE({new:{...message,is_deleted:true}}));expect(result.current.messages).toHaveLength(0);
});
