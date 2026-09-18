import { renderHook, waitFor, cleanup, act } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';

const m = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test' }, profile: {}, userRole: { role: 'member' } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const query: any = { select: () => query, eq: () => query, is: () => query, order: () => query, gt: () => query, limit: m.limit };
      return query;
    },
    channel: () => {
      const channel: any = { on: () => channel, subscribe: () => channel };
      return channel;
    },
    removeChannel: vi.fn(),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    realtime: { setAuth: vi.fn() },
  },
}));

import { useRoomMessages, ROOM_LOAD_TIMEOUT_MS } from '@/hooks/useRoomMessages';

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

it('surfaces a load failure instead of an empty room', async () => {
  m.limit.mockResolvedValue({ data: null, error: { message: 'network down' } });
  const { result } = renderHook(() => useRoomMessages('error-room'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('network down');
  expect(result.current.messages).toHaveLength(0);
});

it('bounds the initial load so a stalled request cannot skeleton forever', async () => {
  vi.useFakeTimers();
  m.limit.mockReturnValue(new Promise(() => {}));
  const { result } = renderHook(() => useRoomMessages('stalled-room'));
  expect(result.current.loading).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ROOM_LOAD_TIMEOUT_MS + 100);
  });
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeTruthy();
});

it('clears the error and recovers on retry', async () => {
  m.limit.mockResolvedValueOnce({ data: null, error: { message: 'network down' } });
  const { result } = renderHook(() => useRoomMessages('retry-room'));
  await waitFor(() => expect(result.current.error).toBe('network down'));
  m.limit.mockResolvedValue({
    data: [{ id: 'one', room_slug: 'retry-room', user_id: 'other', user_name: 'Other', user_role: 'beginner', body: 'Hello', created_at: '2026-09-17T12:00:00Z' }],
    error: null,
  });
  await act(async () => { await result.current.refresh(); });
  expect(result.current.error).toBeNull();
  expect(result.current.messages.map((row) => row.id)).toEqual(['one']);
  expect(result.current.loading).toBe(false);
});
