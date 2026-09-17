import {act,renderHook,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
const m=vi.hoisted(()=>({receive:undefined as undefined|((e:{payload:Record<string,unknown>})=>void),send:vi.fn().mockResolvedValue('ok'),remove:vi.fn()}));
vi.mock('@/integrations/supabase/localPreviewFetch',()=>({isLocalDesignPreview:()=>false}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{channel:()=>{
 const channel={on:(_type:string,_filter:unknown,handler:typeof m.receive)=>{m.receive=handler;return channel;},subscribe:(cb:(s:string)=>void)=>{cb('SUBSCRIBED');return channel;},send:m.send};return channel;
},removeChannel:m.remove}}));
import {useTypingIndicator} from '@/hooks/useTypingIndicator';
afterEach(()=>{cleanup();vi.useRealTimers();vi.clearAllMocks();});
it('keeps a continuously typing person visible and expires after they stop',()=>{
 vi.useFakeTimers();const {result}=renderHook(()=>useTypingIndicator('floor','me','Me'));
 const event={payload:{userId:'other',userName:'Alex Trader'}};
 act(()=>{m.receive!(event);vi.advanceTimersByTime(2000);m.receive!(event);vi.advanceTimersByTime(2000);});
 expect(result.current.typingText).toBe('Alex is typing');
 act(()=>{vi.advanceTimersByTime(1500);});expect(result.current.typingText).toBeNull();
});
it('throttles keystrokes, sends stop, and immediately allows the next typing session',()=>{
 vi.useFakeTimers();const {result}=renderHook(()=>useTypingIndicator('floor','me','Me'));
 act(()=>{result.current.broadcastTyping();result.current.broadcastTyping();});expect(m.send).toHaveBeenCalledTimes(1);
 act(()=>result.current.stopTyping());expect(m.send.mock.lastCall?.[0].payload.typing).toBe(false);
 act(()=>result.current.broadcastTyping());expect(m.send).toHaveBeenCalledTimes(3);
});
it('clears state on a room switch and ignores malformed events',()=>{
 vi.useFakeTimers();const view=renderHook(({room})=>useTypingIndicator(room,'me','Me'),{initialProps:{room:'a'}});
 act(()=>{m.receive!({payload:{userId:'other',userName:'Alex'}});m.receive!({payload:{userId:'invalid'}});});
 expect(view.result.current.typingText).toBe('Alex is typing');view.rerender({room:'b'});expect(view.result.current.typingText).toBeNull();
 act(()=>{vi.advanceTimersByTime(4000);});expect(view.result.current.typingText).toBeNull();
});
