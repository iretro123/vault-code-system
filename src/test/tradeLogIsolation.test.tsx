import {act,cleanup,renderHook} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({user:{id:'a'} as {id:string}|null, read:vi.fn(), insert:vi.fn(), toast:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:mock.toast})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select:()=>({eq:()=>({order:()=>({limit:mock.read})})}),insert:()=>({select:()=>({single:mock.insert})})}),functions:{invoke:vi.fn()}}}));
import {useTradeLog} from '@/hooks/useTradeLog';
const entry=(user_id:string)=>({id:user_id,user_id,trade_date:'2026-10-01',risk_used:1,risk_reward:1,followed_rules:true,emotional_state:1,notes:null,created_at:'2026-10-01'});
beforeEach(()=>{localStorage.clear();mock.user={id:'a'};mock.read.mockReset().mockResolvedValue({data:[entry('a')],error:null});mock.insert.mockReset();mock.toast.mockClear();});
afterEach(cleanup);
it('ignores legacy shared cache and validates scoped cache ownership',async()=>{
 localStorage.setItem('va_cache_trade_entries',JSON.stringify([entry('b')]));
 localStorage.setItem('va_cache_trade_entries:a',JSON.stringify([entry('b')]));
 mock.read.mockReturnValue(new Promise(()=>{}));
 const {result}=renderHook(()=>useTradeLog());
 expect(result.current.entries).toEqual([]);expect(localStorage.getItem('va_cache_trade_entries')).toBeNull();
});
it('hides old account immediately and rejects its delayed fetch',async()=>{
 let resolve!:(value:unknown)=>void;
 mock.read.mockReturnValueOnce(new Promise(r=>{resolve=r;}));
 const view=renderHook(()=>useTradeLog());
 mock.user={id:'b'};mock.read.mockResolvedValue({data:[entry('b')],error:null});
 view.rerender();await act(async()=>{});
 await act(async()=>resolve({data:[entry('a')],error:null}));
 expect(view.result.current.entries).toEqual([entry('b')]);expect(localStorage.getItem('va_cache_trade_entries:a')).toBeNull();
 mock.user=null;view.rerender();expect(view.result.current.entries).toEqual([]);
});
it('does not let a delayed mutation update another account or its cache',async()=>{
 const view=renderHook(()=>useTradeLog());await act(async()=>{});
 let resolve!:(value:unknown)=>void;mock.insert.mockReturnValue(new Promise(r=>{resolve=r;}));
 let promise!:ReturnType<typeof view.result.current.addEntry>;
 act(()=>{promise=view.result.current.addEntry({risk_used:1,risk_reward:1,followed_rules:true,emotional_state:1});});
 mock.user={id:'b'};mock.read.mockResolvedValue({data:[entry('b')],error:null});view.rerender();await act(async()=>{});
 await act(async()=>{resolve({data:{...entry('a'),id:'new'},error:null});await promise;});
 expect(view.result.current.entries).toEqual([entry('b')]);expect(mock.toast).not.toHaveBeenCalled();
 expect(JSON.parse(localStorage.getItem('va_cache_trade_entries:a')!)).toEqual([entry('a')]);
});
