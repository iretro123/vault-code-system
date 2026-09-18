import { render, screen, act, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AppLoading } from '@/components/AppLoading';

afterEach(() => { cleanup(); vi.useRealTimers(); });
it('shows a calm accessible startup state and recovery for a stalled load', () => {
  vi.useFakeTimers();
  const view = render(<AppLoading />);
  expect(screen.getByRole('status').textContent).toContain('Opening your workspace');
  expect(screen.queryByRole('button')).toBeNull();
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
