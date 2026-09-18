import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TradingCampus from '@/design-studio/TradingCampus';
vi.mock('@/design-studio/DailyStudyCard', () => ({ default: () => null }));
afterEach(cleanup);
it.each(['RZ', 'Alex Jordan', '  Sam  '])('greets the supplied member %s', name => {
  render(<TradingCampus act={() => {}} memberName={name} />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(`Welcome back, ${name.trim()}`);
  expect(screen.queryByText('YOUR DAILY MEETUP WITH THE MARKET')).toBeNull();
});
it('does not substitute RZ for a missing name', () => {
  render(<TradingCampus act={() => {}} />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome back');
});
