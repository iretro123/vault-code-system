import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({rpc: vi.fn(), auth: undefined as undefined | ((event: string, session: {user:{id:string}} | null) => void)}));
vi.mock('@/integrations/supabase/client', () => ({supabase: {rpc: mocks.rpc, auth: {onAuthStateChange: (cb: typeof mocks.auth) => {mocks.auth = cb; return {data:{subscription:{unsubscribe:vi.fn()}}};}}}}));
import {usePulseLiquidity} from '@/hooks/usePulseLiquidity';
const saved = {5:{capturedAt:100,quoteAt:100,above:765,below:760,available:false,chartUrl:'https://example.com/spy.png'}};
beforeEach(() => {vi.useFakeTimers(); mocks.rpc.mockReset().mockResolvedValue({data:saved,error:null}); Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});});
afterEach(() => {cleanup(); vi.useRealTimers();});
it('does not show another symbol while its request is pending', async () => {
 const view = renderHook(({symbol}) => usePulseLiquidity(true,symbol), {initialProps:{symbol:'AMEX:SPY' as 'AMEX:SPY'|'NASDAQ:QQQ'}});
 await act(async () => {}); expect(view.result.current).toEqual(saved);
 mocks.rpc.mockReturnValue(new Promise(() => {}));
 view.rerender({symbol:'NASDAQ:QQQ'}); expect(view.result.current).toEqual({});
});
it('retains the dated image on network failure but clears denied membership', async () => {
 const {result} = renderHook(() => usePulseLiquidity(true)); await act(async () => {});
 mocks.rpc.mockRejectedValue(new Error('offline')); await act(async () => vi.advanceTimersByTimeAsync(15000)); expect(result.current).toEqual(saved);
 mocks.rpc.mockResolvedValue({data:null,error:{code:'42501'}}); await act(async () => vi.advanceTimersByTimeAsync(15000)); expect(result.current).toEqual({});
});
it('does not clear on token renewal and clears on account change', async () => {
 const {result} = renderHook(() => usePulseLiquidity(true)); await act(async () => {});
 await act(async () => mocks.auth?.('INITIAL_SESSION',{user:{id:'one'}}));
 mocks.rpc.mockReturnValue(new Promise(() => {}));
 await act(async () => mocks.auth?.('TOKEN_REFRESHED',{user:{id:'one'}})); expect(result.current).toEqual(saved);
 await act(async () => mocks.auth?.('SIGNED_OUT',null)); expect(result.current).toEqual({});
});
it('retries immediately after an auth change invalidates an in-flight response', async () => {
 let resolve!: (value:unknown) => void;
 mocks.rpc.mockReturnValueOnce(new Promise(r => {resolve=r;}));
 const {result} = renderHook(() => usePulseLiquidity(true));
 await act(async () => mocks.auth?.('SIGNED_IN',{user:{id:'new'}}));
 await act(async () => resolve({data:{5:{...saved[5],chartUrl:'old-account'}},error:null}));
 expect(mocks.rpc).toHaveBeenCalledTimes(2); expect(result.current).toEqual(saved);
});
