import {afterEach,it,expect,vi} from 'vitest';
import {act,cleanup,renderHook,waitFor,render,screen,fireEvent} from '@testing-library/react';
const mock=vi.hoisted(()=>({fetch:vi.fn(),changed:()=>{},removeChannel:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{channel:()=>{const c={on:(_event:string,_filter:unknown,callback:()=>void)=>{mock.changed=callback;return c;},subscribe:()=>c};return c;},removeChannel:mock.removeChannel,from:()=>{const q={select:()=>q,order:()=>q,eq:()=>q,then:(resolve:(value:unknown)=>void,reject:(reason:unknown)=>void)=>mock.fetch().then(resolve,reject)};return q;}}}));
import {useAcademyLessons} from '@/hooks/useAcademyLessons';
import {LessonVideo,safeLessonVideoUrl} from '@/components/academy/LessonVideo';
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();localStorage.clear();mock.fetch.mockReset();});
it('finishes loading even when browser cache cannot be written',async()=>{
 mock.fetch.mockResolvedValue({data:[{id:'one',module_slug:'a'}],error:null});
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});
 const view=renderHook(()=>useAcademyLessons('a'));
 await waitFor(()=>expect(view.result.current.loading).toBe(false));
 expect(view.result.current.lessons).toHaveLength(1);expect(view.result.current.error).toBeNull();
});
it('shows failure and recovers on retry',async()=>{
 mock.fetch.mockRejectedValueOnce(Error('offline')).mockResolvedValue({data:[{id:'one',module_slug:'a'}],error:null});
 const view=renderHook(()=>useAcademyLessons('a'));
 await waitFor(()=>expect(view.result.current.error).toMatch(/couldn’t load/));
 await act(async()=>{await view.result.current.refetch();});
 expect(view.result.current.error).toBeNull();expect(view.result.current.lessons).toHaveLength(1);
});
it('ignores late lesson results from another chapter',async()=>{
 let finish:(x:unknown)=>void=()=>{};
 mock.fetch.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({data:[{id:'b',module_slug:'b'}],error:null});
 const view=renderHook(({slug})=>useAcademyLessons(slug),{initialProps:{slug:'a'}});
 await act(async()=>{});view.rerender({slug:'b'});
 await waitFor(()=>expect(view.result.current.lessons[0]?.id).toBe('b'));
 await act(async()=>{finish({data:[{id:'a',module_slug:'a'}],error:null});});
 expect(view.result.current.lessons[0].id).toBe('b');
});
it('offers player retry after a timeout and preserves an original-video exit',()=>{
 vi.useFakeTimers();render(<LessonVideo url="https://www.youtube.com/watch?v=abcdefghijk" title="Sample lesson"/>);
 act(()=>vi.advanceTimersByTime(12000));expect(screen.getByRole('status')).toHaveTextContent('longer than expected');
 fireEvent.click(screen.getByRole('button',{name:'Reload player'}));expect(screen.getByRole('status')).toHaveTextContent('Loading player');
 expect(screen.getByRole('link',{name:/Open original/})).toHaveAttribute('href','https://www.youtube.com/watch?v=abcdefghijk');
});
it('does not create executable or credential-bearing source links',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,bad','https://user:pass@example.com'])expect(safeLessonVideoUrl(value)).toBeNull();
 render(<LessonVideo url="javascript:alert(1)" title="Bad lesson"/>);expect(screen.queryByRole('link')).toBeNull();
});
it('refreshes a supplied link after an external lesson edit and cleans up its channel',async()=>{
 mock.fetch.mockResolvedValueOnce({data:[{id:'one',module_slug:'a',video_url:''}],error:null})
 .mockResolvedValue({data:[{id:'one',module_slug:'a',video_url:'https://youtu.be/abcdefghijk'}],error:null});
 const view=renderHook(()=>useAcademyLessons('a'));
 await waitFor(()=>expect(view.result.current.loading).toBe(false));
 act(()=>mock.changed());
 await waitFor(()=>expect(view.result.current.lessons[0].video_url).toContain('abcdefghijk'));
 view.unmount();expect(mock.removeChannel).toHaveBeenCalled();
});
it('recovers external edits on returning to the app when Realtime is unavailable',async()=>{
 mock.fetch.mockResolvedValue({data:[{id:'one',module_slug:'a'}],error:null});
 const view=renderHook(()=>useAcademyLessons('a'));
 await waitFor(()=>expect(view.result.current.loading).toBe(false));
 act(()=>window.dispatchEvent(new Event('focus')));
 await waitFor(()=>expect(mock.fetch).toHaveBeenCalledTimes(2));
});
