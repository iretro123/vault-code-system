import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/assets/classroom-open.svg', () => ({ default: 'classroom-open.svg' }));

import VaultLivePreview from '@/components/academy/live/VaultLivePreview';

const links=vi.hoisted(()=>({trading:'https://zoom.example/trading',wednesday:'https://zoom.example/wednesday'}));
vi.mock('@/hooks/useClassroomLinks',()=>({useClassroomLinks:()=>({links,loading:false})}));
const EXPECTED_TRADING_ZOOM=links.trading;

afterEach(() => {
  vi.restoreAllMocks();
});

const page = () =>
  render(
    <MemoryRouter>
      <VaultLivePreview />
    </MemoryRouter>
  );

it('uses the Monday–Thursday trading Zoom link when opening the trading room', () => {
  page();
  fireEvent.click(screen.getByRole('button', { name: 'Open trading room' }));
  const joinLink = screen.getByRole('link', { name: /Join on Zoom/i });
  expect(joinLink).toHaveAttribute('href', EXPECTED_TRADING_ZOOM);
  expect(joinLink).toHaveAttribute('target', '_blank');
  expect(joinLink).toHaveAttribute('rel', 'noopener noreferrer');
});

it('does not embed an env room link over membership-protected data', () => {
  import.meta.env.VITE_VAULT_TRADING_ZOOM_URL = 'https://unprotected.example/room';
  page();
  fireEvent.click(screen.getByRole('button', { name: 'Open trading room' }));
  expect(screen.getByRole('link', { name: /Join on Zoom/i })).toHaveAttribute('href', links.trading);
});

it('does not change the Wednesday class link', () => {
  page();
  fireEvent.click(screen.getByRole('tab', { name: 'Wednesday Class' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open training room' }));
  expect(screen.getByRole('link', { name: /Join on Zoom/i })).toHaveAttribute(
    'href',
    links.wednesday
  );
});
