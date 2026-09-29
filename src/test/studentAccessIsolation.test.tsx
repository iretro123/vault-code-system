import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

type QueryOptions = { queryKey?: unknown[]; placeholderData?: unknown; queryFn?: () => Promise<unknown> };
const state = vi.hoisted(() => ({ userId: 'member-a', options: {} as QueryOptions, data: undefined as undefined | {status:string;hasAccess:boolean}, error: null as null | Error }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({
  user: { id: state.userId, email: 'ordinary@example.invalid' },
  profile: { display_name: 'appreview', username: 'appreview' }, userRole: {role:'vault_access'},
}) }));
vi.mock('@/hooks/useAcademyPermissions', () => ({ useAcademyPermissions: () => ({ resolved: true, isCEO: false, isAdmin: false, isCoach: false, isOperator: false }) }));
vi.mock('@/integrations/supabase/localPreviewFetch', () => ({ isLocalDesignPreview: () => true }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: QueryOptions) => { state.options = options; return { data: state.data, error: state.error, isLoading: false }; },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
import { supabase } from '@/integrations/supabase/client';
import { useStudentAccess } from '@/hooks/useStudentAccess';

beforeEach(() => { localStorage.clear(); state.userId = 'member-a'; state.data=undefined;state.error=null; });
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
  expect(view.result.current.hasAccess).toBe(false);
  state.userId = 'member-b';
  view.rerender();
  expect(view.result.current.hasAccess).toBe(false);
  expect(state.options.queryKey).toEqual(['student-access', 'member-b']);
});

it('accepts the server whitelist decision without a Stripe record',()=>{
  state.data={status:'active',hasAccess:true};
  expect(renderHook(useStudentAccess).result.current.hasAccess).toBe(true);
});
it('a paid role cannot override an inactive server entitlement',()=>{
  state.data={status:'canceled',hasAccess:false};
  expect(renderHook(useStudentAccess).result.current.hasAccess).toBe(false);
});
it('fails closed after an entitlement refresh error',()=>{
  state.data={status:'active',hasAccess:true};state.error=new Error('offline');
  expect(renderHook(useStudentAccess).result.current.hasAccess).toBe(false);
});

it('reads access with GET while retaining the server decision',async()=>{
  vi.mocked(supabase.rpc).mockResolvedValue({data:[{status:'active',tier:'full',product_key:'vault',has_access:true}],error:null} as never);
  renderHook(useStudentAccess);
  expect(await state.options.queryFn!()).toMatchObject({hasAccess:true,status:'active'});
  expect(supabase.rpc).toHaveBeenCalledWith('get_my_access_state',{}, {get:true});
});
