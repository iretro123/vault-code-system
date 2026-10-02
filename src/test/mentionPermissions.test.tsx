import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete';
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn(async () => ({ data: [] })) } }));
it('uses the latest everyone permission while autocomplete remains enabled', async () => {
  const hook = renderHook(({ allowed }) => useMentionAutocomplete({ enabled: true, canPingEveryone: allowed }), { initialProps: { allowed: true } });
  await act(async () => hook.result.current.updateMentionState('@eve', 4));
  expect(hook.result.current.suggestions).toContainEqual({ type: 'everyone' });
  hook.rerender({ allowed: false });
  act(() => hook.result.current.updateMentionState('@eve', 4));
  expect(hook.result.current.suggestions).not.toContainEqual({ type: 'everyone' });
  hook.rerender({ allowed: true });
  act(() => hook.result.current.updateMentionState('@eve', 4));
  expect(hook.result.current.suggestions).toContainEqual({ type: 'everyone' });
});
