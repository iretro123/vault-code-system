import { afterEach, expect, it, vi } from 'vitest';
import { openExternalUrl } from '../lib/externalLinks';

afterEach(() => vi.restoreAllMocks());

it('opens an isolated tab without leaving the app when noopener returns null', () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  const before = window.location.href;
  openExternalUrl('https://example.com/class');
  expect(open).toHaveBeenCalledWith('https://example.com/class', '_blank', 'noopener,noreferrer');
  expect(window.location.href).toBe(before);
});
