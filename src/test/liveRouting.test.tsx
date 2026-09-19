import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';

const state = vi.hoisted(() => ({ admin: true, permission: true, access: true, loading: false }));
vi.mock('@/hooks/useStudentAccess', () => ({ useStudentAccess: () => ({ hasAccess: state.access, loading: state.loading, status: 'inactive' }) }));
vi.mock('@/contexts/AdminModeContext', () => ({ useAdminMode: () => ({ isAdminActive: state.admin }) }));
vi.mock('@/hooks/useAcademyPermissions', () => ({ useAcademyPermissions: () => ({ hasPermission: () => state.permission }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/hooks/useLiveNow', () => ({ useLiveNow: () => ({ liveSession: null, refresh: vi.fn() }) }));
vi.mock('@/components/academy/live/VaultLivePreview', () => ({ default: () => <div>New Vault Live</div> }));
vi.mock('@/components/academy/PremiumGate', () => ({ PremiumGate: () => <div>Membership required</div> }));
vi.mock('@/components/admin/AdminActionBar', () => ({ AdminActionBar: () => null }));
vi.mock('@/components/admin/AdminOnly', () => ({ AdminOnly: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [] }) }) }) } }));
import { ReleasedLivePage } from '@/pages/academy/AcademyLive';
const page = () => <MemoryRouter><ReleasedLivePage /></MemoryRouter>;
beforeEach(() => { Object.assign(state, { admin: true, permission: true, access: true, loading: false }); localStorage.clear(); });
afterEach(cleanup);

it.each([true, false])('defaults to new design for admin=%s', admin => {
  state.admin = admin;
  render(page());
  expect(screen.getByText('New Vault Live')).toBeInTheDocument();
  expect(!!screen.queryByRole('button', { name: 'Manage sessions' })).toBe(admin);
});
it('requires management permission', () => {
  state.permission = false;
  render(page());
  expect(screen.queryByRole('button', { name: 'Manage sessions' })).not.toBeInTheDocument();
});
it.each(['loading', 'access'] as const)('preserves %s gate', gate => {
  state[gate] = gate === 'loading';
  render(page());
  expect(screen.queryByText('New Vault Live')).not.toBeInTheDocument();
  expect(screen.getByText(gate === 'loading' ? 'Loading classroom access…' : 'Membership required')).toBeInTheDocument();
});
it('opens management explicitly and returns to the new view', async () => {
  render(page());
  fireEvent.click(screen.getByRole('button', { name: 'Manage sessions' }));
  expect(screen.queryByText('New Vault Live')).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Live Sessions' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Back to Vault Live' }));
  expect(screen.getByText('New Vault Live')).toBeInTheDocument();
});
it.each(['admin', 'permission'] as const)('hides management immediately on loss of %s', async key => {
  const view = render(page());
  fireEvent.click(screen.getByRole('button', { name: 'Manage sessions' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Live Sessions' })).toBeInTheDocument());
  state[key] = false;
  view.rerender(page());
  expect(screen.getByText('New Vault Live')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Back to Vault Live' })).not.toBeInTheDocument();
});
