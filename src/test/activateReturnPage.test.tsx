import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ensureProfile } from '@/lib/ensureProfile';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'a@b.com' }, loading: false, refetchProfile: vi.fn() }) }));
vi.mock('@/lib/ensureProfile', () => ({ ensureProfile: vi.fn().mockRejectedValue(new Error('db down')) }));
const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) }, auth: { signOut: vi.fn(), signInWithOtp: vi.fn() } } }));

import ActivateReturn from '@/pages/ActivateReturn';

describe('ActivateReturn failure path', () => {
  it('clears busy and shows retry message when ensureProfile throws', async () => {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><ActivateReturn /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Something went wrong/));
    const btn = screen.getByRole('button', { name: /Check my paid membership/ });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
});


describe('ActivateReturn successful claim', () => {
  it('refreshes both previously locked access caches before showing success', async () => {
    cleanup();
    vi.mocked(ensureProfile).mockResolvedValue(undefined);
    invoke.mockResolvedValue({data: {success: true}, error: null});
    const client = new QueryClient();
    client.setQueryData(['student-access', 'u1'], {hasAccess: false});
    client.setQueryData(['academy-permissions', 'u1'], {hasFullAccess: false});
    render(<QueryClientProvider client={client}><MemoryRouter><ActivateReturn /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByRole('link', {name: /Open Vault on the web/})).toBeTruthy());
    expect(client.getQueryState(['student-access', 'u1'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['academy-permissions', 'u1'])?.isInvalidated).toBe(true);
  });
});
