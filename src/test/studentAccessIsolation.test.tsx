import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

type QueryOptions = { queryKey?: unknown[]; placeholderData?: unknown };
const state = vi.hoisted(() => ({ userId: 'member-a', options: {} as QueryOptions }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({
  user: { id: state.userId, email: 'ordinary@example.invalid' },
  profile: { display_name: 'appreview', username: 'appreview' }, userRole: null,
}) }));
vi.mock('@/hooks/useAcademyPermissions', () => ({ useAcademyPermissions: () => ({ resolved: true, isCEO: false, isAdmin: false, isCoach: false, isOperator: false }) }));
vi.mock('@/integrations/supabase/localPreviewFetch', () => ({ isLocalDesignPreview: () => true }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: QueryOptions) => { state.options = options; return { data: options.placeholderData, isLoading: false }; },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
import { useStudentAccess } from '@/hooks/useStudentAccess';

beforeEach(() => { localStorage.clear(); state.userId = 'member-a'; });
afterEach(cleanup);

it('never grants review access based on an editable display name or username', () => {
  const { result } = renderHook(useStudentAccess);
  expect(result.current.hasAccess).toBe(false);
  expect(result.current.isAdminBypass).toBe(false);
});

it('does not reuse another member’s cached entitlement after an account switch', () => {
  const cached = JSON.stringify({ status: 'active', hasAccess: true, ts: Date.now() });
  localStorage.setItem('va_cache_student_access', cached);
  localStorage.setItem('va_cache_student_access:member-a', cached);
  const view = renderHook(useStudentAccess);
  expect(view.result.current.hasAccess).toBe(true);
  state.userId = 'member-b';
  view.rerender();
  expect(view.result.current.hasAccess).toBe(false);
  expect(state.options.queryKey).toEqual(['student-access', 'member-b']);
});
