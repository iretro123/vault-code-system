import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,renderHook,waitFor} from '@testing-library/react';
const state=vi.hoisted(()=>({user:{id:'one'},local:false,write:vi.fn(),error:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/integrations/supabase/localPreviewFetch',()=>({isLocalDesignPreview:()=>state.local}));
vi.mock('sonner',()=>({toast:{error:state.error}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>({
 select:()=>({order:async()=>({data:[]}),eq:()=>({then:(resolve:any)=>resolve({data:[]}),maybeSingle:async()=>({data:null})})}),
 upsert:state.write,
})}}));
import {usePlaybookProgress} from '@/hooks/usePlaybookProgress';
afterEach(()=>{cleanup();localStorage.clear();state.user={id:'one'};state.local=false;vi.clearAllMocks();});
it('does not mark progress complete when the database rejects the save',async()=>{
 state.write.mockResolvedValue({error:{message:'denied'}});
 const hook=renderHook(()=>usePlaybookProgress());
 await waitFor(()=>expect(hook.result.current.loading).toBe(false));
 await act(async()=>{expect(await hook.result.current.updateProgress('chapter',{status:'completed'})).toBe(false);});
 expect(hook.result.current.progress.chapter).toBeUndefined();
 expect(state.error).toHaveBeenCalled();
});
it('keeps local preview progress isolated by account without database writes',async()=>{
 state.local=true;
 const hook=renderHook(()=>usePlaybookProgress());
 await waitFor(()=>expect(hook.result.current.loading).toBe(false));
 await act(async()=>{await hook.result.current.updateProgress('chapter',{status:'completed'});});
 expect(hook.result.current.progress.chapter.status).toBe('completed');
 await act(async()=>{state.user={id:'two'};hook.rerender();});
 expect(hook.result.current.progress.chapter).toBeUndefined();
 expect(state.write).not.toHaveBeenCalled();
 expect(localStorage.getItem('va_cache_pb_progress:one')).toContain('completed');
});
