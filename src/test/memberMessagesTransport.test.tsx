import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({rpc:vi.fn(),receive:undefined as undefined|((payload:{new:unknown})=>void),history:Promise.resolve({data:[],error:null}) as Promise<{data:unknown[];error:unknown}>}));
vi.mock('@/integrations/supabase/localPreviewFetch',()=>({isLocalDesignPreview:()=>false}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 rpc:m.rpc,
 from:(table:string)=>{
   const response=()=>table==='member_messages'?m.history:Promise.resolve({data:[],error:null});
   const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>response(),then:(resolve:(r:unknown)=>void)=>response().then(resolve)};return q;
 },
 channel:()=>{const c={on:(_event:string,filter:{table:string},cb:typeof m.receive)=>{if(filter.table==='member_messages')m.receive=cb;return c;},subscribe:(cb?:(status:string)=>void)=>{cb?.('SUBSCRIBED');return c;}};return c;},
 removeChannel:vi.fn(),
}}));
import {useMemberMessages} from '@/hooks/useMemberMessages';
afterEach(()=>{cleanup();vi.clearAllMocks();sessionStorage.clear();m.history=Promise.resolve({data:[],error:null});});
it('keeps a failed send and retries the same ID without duplication',async()=>{
 m.rpc.mockResolvedValueOnce({data:null,error:{message:'offline'}});
 const {result}=renderHook(()=>useMemberMessages('me','conversation'));
 await act(async()=>{expect(await result.current.send('Keep this')).toBe(false);});
 const failed=result.current.messages[0];expect(failed.status).toBe('failed');
 expect(JSON.parse(sessionStorage.getItem('vault-member-outbox:me')!)[0].body).toBe('Keep this');
 m.rpc.mockResolvedValueOnce({data:{...failed,status:undefined},error:null});
 await act(async()=>{expect(await result.current.send(failed.body,failed)).toBe(true);});
 expect(m.rpc.mock.calls[0][1].message_id).toBe(m.rpc.mock.calls[1][1].message_id);
 act(()=>m.receive?.({new:{...failed,status:undefined}}));
 expect(result.current.messages).toHaveLength(1);expect(result.current.messages[0].status).toBeUndefined();
 expect(JSON.parse(sessionStorage.getItem('vault-member-outbox:me')!)).toHaveLength(0);
});
it('does not let a delayed request put an old conversation into the new one',async()=>{
 let finish!:(value:{data:unknown[];error:null})=>void;
 m.history=new Promise(resolve=>{finish=resolve;});
 const view=renderHook(({id})=>useMemberMessages('me',id),{initialProps:{id:'old'}});
 m.history=Promise.resolve({data:[],error:null});view.rerender({id:'new'});
 await act(async()=>finish({data:[{id:'old-message',conversation_id:'old',sender_id:'other',body:'Private old thread',created_at:new Date().toISOString()}],error:null}));
 await waitFor(()=>expect(view.result.current.historyLoading).toBe(false));
 expect(view.result.current.messages).toEqual([]);
});
