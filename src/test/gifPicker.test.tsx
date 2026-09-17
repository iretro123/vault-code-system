import {act,cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
// Test request/state behavior here; real-browser checks cover Radix positioning.
vi.mock('@/components/ui/popover',async()=>{
 const React=await import('react');
 const Context=React.createContext<any>(null);
 return {
  Popover:({open,onOpenChange,children}:any)=><Context.Provider value={{open,onOpenChange}}>{children}</Context.Provider>,
  PopoverTrigger:({children}:any)=>{const c=React.useContext(Context);return React.cloneElement(children,{onClick:()=>c.onOpenChange(!c.open)});},
  PopoverContent:({children}:any)=>React.useContext(Context).open?<div>{children}</div>:null,
 };
});
const {invoke}=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke}}}));
import {GifPicker} from '@/components/academy/chat/GifPicker';
afterEach(()=>{cleanup();vi.useRealTimers();vi.resetAllMocks();});
it('restores trending after clearing a search and closes without sending',async()=>{
 invoke.mockResolvedValue({data:{gifs:[]},error:null});const send=vi.fn();render(<GifPicker onSelect={send}/>);
 fireEvent.click(screen.getByRole('button',{name:'Choose a GIF'}));
 await waitFor(()=>expect(invoke).toHaveBeenCalledWith('giphy-search',expect.objectContaining({body:{type:'trending'}})));
 await screen.findByText('No GIFs found.');
 fireEvent.change(screen.getByRole('textbox',{name:'Search GIFs'}),{target:{value:'happy'}});
 await waitFor(()=>expect(invoke).toHaveBeenCalledWith('giphy-search',expect.objectContaining({body:{q:'happy',type:'search'}})));
 await screen.findByText('No GIFs found.');
 fireEvent.click(screen.getByRole('button',{name:'Clear GIF search'}));
 expect(screen.getByText('Trending now')).toBeInTheDocument();
 expect(invoke).toHaveBeenCalledTimes(2);
 fireEvent.click(screen.getByRole('button',{name:'Close GIF picker'}));expect(send).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Choose a GIF'}));
 expect(screen.getByText('No GIFs found.')).toBeInTheDocument();
 expect(invoke).toHaveBeenCalledTimes(2);
});
it('times out stalled requests and aborts them',async()=>{
 vi.useFakeTimers();invoke.mockImplementation(()=>new Promise(()=>{}));
 render(<GifPicker onSelect={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Choose a GIF'}));
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});
 const signal=invoke.mock.calls[0][1].signal;
 await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
 expect(signal.aborted).toBe(true);
 expect(screen.getByText('GIFs couldn’t load.')).toBeInTheDocument();
});
it('ignores late results when the search changes',async()=>{
 vi.useFakeTimers();let resolveOld:any;
 invoke.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;}))
  .mockResolvedValue({data:{gifs:[{id:'new',title:'New result',url:'https://example.com/new.gif',preview_url:'https://example.com/new.gif'}]}});
 render(<GifPicker onSelect={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Choose a GIF'}));
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});
 fireEvent.change(screen.getByRole('textbox',{name:'Search GIFs'}),{target:{value:'new'}});
 await act(async()=>{await vi.advanceTimersByTimeAsync(200);});
 await act(async()=>{resolveOld({data:{gifs:[]}});});
 expect(screen.getByRole('button',{name:'Send New result'})).toBeInTheDocument();
 expect(invoke.mock.calls[0][1].signal.aborted).toBe(true);
});
it('refreshes cached results after five minutes',async()=>{
 vi.useFakeTimers();invoke.mockResolvedValue({data:{gifs:[]}});
 render(<GifPicker onSelect={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Choose a GIF'}));
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});
 fireEvent.click(screen.getByRole('button',{name:'Close GIF picker'}));
 await act(async()=>{await vi.advanceTimersByTimeAsync(300001);});
 fireEvent.click(screen.getByRole('button',{name:'Choose a GIF'}));
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});
 expect(invoke).toHaveBeenCalledTimes(2);
});
it('distinguishes service errors from empty searches and retries',async()=>{
 invoke.mockResolvedValueOnce({error:new Error('offline')}).mockResolvedValue({data:{gifs:[]}});
 render(<GifPicker onSelect={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Choose a GIF'}));
 expect(await screen.findByText('GIFs couldn’t load.')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));
 expect(await screen.findByText('No GIFs found.')).toBeInTheDocument();
});
