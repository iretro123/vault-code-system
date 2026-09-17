import { afterEach, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { isLocalDesignPreview, localPreviewFetch } from '@/integrations/supabase/localPreviewFetch';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each([true, false])('blocks storage mutations in local web preview with DEV=%s', async (dev) => {
  vi.stubEnv('DEV', dev);
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  vi.stubGlobal('window', { location: { hostname: '127.0.0.1' } });
  const network = vi.fn(); vi.stubGlobal('fetch', network);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const response = await localPreviewFetch('https://example.supabase.co/storage/v1/object/academy-chat-files/test.png', { method });
    expect(response.status).toBe(403);
  }
  expect(network).not.toHaveBeenCalled();
});

it('preserves native localhost behavior', () => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  vi.stubGlobal('window', { location: { hostname: 'localhost' } });
  expect(isLocalDesignPreview()).toBe(false);
});

it('preserves hosted behavior', () => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  vi.stubGlobal('window', { location: { hostname: 'member.vaulttradingacademy.com' } });
  expect(isLocalDesignPreview()).toBe(false);
});
