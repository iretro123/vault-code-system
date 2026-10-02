import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ user: { id: 'member' }, read: vi.fn(), insert: vi.fn(), update: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock('@/integrations/supabase/localPreviewFetch', () => ({ isLocalDesignPreview: () => false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
 select: () => ({ eq: () => ({ maybeSingle: mock.read }) }),
 insert: () => ({ select: () => ({ single: mock.insert }) }),
 update: () => ({ eq: () => ({ select: () => ({ single: mock.update }) }) }),
}) } }));
import { useUserPreferences } from '@/hooks/useUserPreferences';
const row = { user_id: 'member', notify_pulse_qqq: false };
beforeEach(() => { vi.clearAllMocks(); mock.read.mockResolvedValue({ data: row, error: null }); });
afterEach(cleanup);
it('does not present failed default creation as saved preferences', async () => {
 mock.read.mockResolvedValue({ data: null, error: null });
 mock.insert.mockResolvedValue({ data: null, error: { code: '42501' } });
 const { result } = renderHook(useUserPreferences);
 await waitFor(() => expect(result.current.loading).toBe(false));
 expect(result.current.prefs).toBeNull();
 expect(await result.current.updatePrefs({ notify_pulse_qqq: true })).toBe(false);
 expect(mock.update).not.toHaveBeenCalled();
});
it('reads a concurrent creation without overwriting that member preference', async () => {
 mock.read.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: {...row, notify_pulse_qqq: true}, error: null });
 mock.insert.mockResolvedValue({ data: null, error: { code: '23505' } });
 const { result } = renderHook(useUserPreferences);
 await waitFor(() => expect(result.current.loading).toBe(false));
 expect(result.current.prefs?.notify_pulse_qqq).toBe(true);
});
it('rejects a zero-row update instead of showing a successful save', async () => {
 mock.update.mockResolvedValue({ data: null, error: null });
 const { result } = renderHook(useUserPreferences);
 await waitFor(() => expect(result.current.loading).toBe(false));
 let ok; await act(async () => { ok = await result.current.updatePrefs({notify_pulse_qqq: true}); });
 expect(ok).toBe(false); expect(result.current.prefs?.notify_pulse_qqq).toBe(false);
});
it('applies the persisted server result on successful save', async () => {
 mock.update.mockResolvedValue({ data: {...row, notify_pulse_qqq: true}, error: null });
 const { result } = renderHook(useUserPreferences);
 await waitFor(() => expect(result.current.loading).toBe(false));
 await act(async () => { expect(await result.current.updatePrefs({notify_pulse_qqq: true})).toBe(true); });
 expect(result.current.prefs?.notify_pulse_qqq).toBe(true);
});
it('ends loading on a transport rejection', async () => {
 mock.read.mockRejectedValue(new Error('offline'));
 const {result} = renderHook(useUserPreferences);
 await waitFor(() => expect(result.current.loading).toBe(false));
 expect(result.current.prefs).toBeNull();
});
