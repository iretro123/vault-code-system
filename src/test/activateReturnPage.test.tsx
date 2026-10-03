import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'a@b.com' }, loading: false, refetchProfile: vi.fn() }) }));
vi.mock('@/lib/ensureProfile', () => ({ ensureProfile: vi.fn().mockRejectedValue(new Error('db down')) }));
const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) }, auth: { signOut: vi.fn(), signInWithOtp: vi.fn() } } }));

import ActivateReturn from '@/pages/ActivateReturn';

describe('ActivateReturn failure path', () => {
  it('clears busy and shows retry message when ensureProfile throws', async () => {
    render(<MemoryRouter><ActivateReturn /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Something went wrong/));
    const btn = screen.getByRole('button', { name: /Check my paid membership/ });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
});
