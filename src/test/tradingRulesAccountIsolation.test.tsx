import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTradingRules } from '@/hooks/useTradingRules';
const mocks = vi.hoisted(() => ({ user: { id: 'a' } as { id: string } | null, reads: [] as Array<(value: unknown) => void> }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => new Promise(resolve => mocks.reads.push(resolve)) }) }) }) } }));
const row = (id: string) => ({ id, max_risk_per_trade: 1, max_trades_per_day: 2, max_daily_loss: 3, allowed_sessions: [], forbidden_behaviors: [] });
beforeEach(() => { mocks.user = { id: 'a' }; mocks.reads = []; });
describe('Trading rules account isolation', () => {
  it('ignores a prior account response that arrives after the new account', async () => {
    const hook = renderHook(() => useTradingRules());
    mocks.user = { id: 'b' }; hook.rerender();
    await act(async () => mocks.reads[1]({ data: row('b'), error: null }));
    await act(async () => mocks.reads[0]({ data: row('a'), error: null }));
    expect(hook.result.current.rules?.id).toBe('b');
  });
  it('clears loaded rules while switching accounts and ignores responses after logout', async () => {
    const hook = renderHook(() => useTradingRules());
    await act(async () => mocks.reads[0]({ data: row('a'), error: null }));
    mocks.user = { id: 'b' }; hook.rerender();
    expect(hook.result.current.rules).toBeNull();
    expect(hook.result.current.loading).toBe(true);
    mocks.user = null; hook.rerender();
    await act(async () => mocks.reads[1]({ data: row('b'), error: null }));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.rules).toBeNull();
  });
});
