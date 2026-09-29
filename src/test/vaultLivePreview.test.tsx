import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/assets/classroom-open.svg', () => ({ default: 'classroom-open.svg' }));

import VaultLivePreview from '@/components/academy/live/VaultLivePreview';

const EXPECTED_TRADING_ZOOM = 'https://us06web.zoom.us/j/84498145528?pwd=iQ6BKlXurpYAhh2d7F0BiKTUylMsxG.1';

beforeEach(() => {
  delete import.meta.env.VITE_VAULT_TRADING_ZOOM_URL;
});

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

it('prefers the env trading Zoom link when present', () => {
  import.meta.env.VITE_VAULT_TRADING_ZOOM_URL = 'https://env.zoom.example/trading';
  page();
  fireEvent.click(screen.getByRole('button', { name: 'Open trading room' }));
  expect(screen.getByRole('link', { name: /Join on Zoom/i })).toHaveAttribute(
    'href',
    'https://env.zoom.example/trading'
  );
});

it('does not change the Wednesday class link', () => {
  import.meta.env.VITE_VAULT_WEDNESDAY_ZOOM_URL = 'https://env.zoom.example/wednesday';
  page();
  fireEvent.click(screen.getByRole('tab', { name: 'Wednesday Class' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open training room' }));
  expect(screen.getByRole('link', { name: /Join on Zoom/i })).toHaveAttribute(
    'href',
    'https://env.zoom.example/wednesday'
  );
});
