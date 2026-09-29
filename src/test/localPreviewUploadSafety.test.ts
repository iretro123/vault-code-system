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

it('permits only the read-only access request, keeping mutations blocked', async () => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  vi.stubGlobal('window', { location: { hostname: '127.0.0.1' } });
  const network = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ has_access: false }])));
  vi.stubGlobal('fetch', network);
  const url = 'https://example.supabase.co/rest/v1/rpc/get_my_access_state';
  const response = await localPreviewFetch(url, { method: 'GET' });
  expect(await response.json()).toEqual([{ has_access: false }]);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    expect((await localPreviewFetch(url, { method })).status).toBe(403);
  }
  expect((await localPreviewFetch('https://example.supabase.co/rest/v1/rpc/grant_whitelist_access', { method: 'GET' })).status).toBe(403);
  expect(network).toHaveBeenCalledTimes(1);
});

it('allows only protected-object signing while uploads stay blocked', async () => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  vi.stubGlobal('window', { location: { hostname: '127.0.0.1' } });
  const network=vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch',network);
  await localPreviewFetch('https://example.supabase.co/storage/v1/object/sign/academy-chat-files/room/file.png',{method:'POST'});
  expect(network).toHaveBeenCalledTimes(1);
  expect((await localPreviewFetch('https://example.supabase.co/storage/v1/object/academy-chat-files/room/file.png',{method:'POST'})).status).toBe(403);
});
