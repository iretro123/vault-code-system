import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
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
const Destination = () => <div>{useLocation().pathname}{useLocation().search}</div>;
const page = () => <MemoryRouter><Routes><Route path="/" element={<ReleasedLivePage />} /><Route path="/academy/admin/panel" element={<Destination />} /></Routes></MemoryRouter>;
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
it('opens the live tab in the admin panel explicitly', () => {
  render(page());
  fireEvent.click(screen.getByRole('button', { name: 'Manage sessions' }));
  expect(screen.queryByText('New Vault Live')).not.toBeInTheDocument();
  expect(screen.getByText('/academy/admin/panel?tab=live')).toBeInTheDocument();
});
it.each(['admin', 'permission'] as const)('hides management immediately on loss of %s', key => {
  const view = render(page());
  expect(screen.getByRole('button', { name: 'Manage sessions' })).toBeInTheDocument();
  state[key] = false;
  view.rerender(page());
  expect(screen.getByText('New Vault Live')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Manage sessions' })).not.toBeInTheDocument();
});
