import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,renderHook,waitFor} from '@testing-library/react';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc,from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:()=>Promise.resolve({data:null}),then:(resolve:(value:unknown)=>void)=>Promise.resolve({count:3,error:null}).then(resolve)};return q;}}}));
import {usePublicProfile} from '@/hooks/usePublicProfile';
afterEach(()=>{cleanup();mock.rpc.mockReset();});
it('does not replace a newly opened member with an older slow response',async()=>{
 let finish:(value:unknown)=>void=()=>{};
 mock.rpc.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({data:[{user_id:'race-b',display_name:'Member B'}]});
 const view=renderHook(({id})=>usePublicProfile(id),{initialProps:{id:'race-a'}});
 view.rerender({id:'race-b'});
 await waitFor(()=>expect(view.result.current.profile?.user_id).toBe('race-b'));
 await act(async()=>{finish({data:[{user_id:'race-a',display_name:'Member A'}]});});
 expect(view.result.current.profile?.user_id).toBe('race-b');
 expect(view.result.current.loading).toBe(false);
});
it('clears the previous member when the next profile cannot be found',async()=>{
 mock.rpc.mockResolvedValueOnce({data:[{user_id:'clear-a',display_name:'Member A'}]}).mockResolvedValue({data:[]});
 const view=renderHook(({id})=>usePublicProfile(id),{initialProps:{id:'clear-a'}});
 await waitFor(()=>expect(view.result.current.profile?.user_id).toBe('clear-a'));
 view.rerender({id:'missing'});
 await waitFor(()=>expect(view.result.current.loading).toBe(false));
 expect(view.result.current.profile).toBeNull();
});
