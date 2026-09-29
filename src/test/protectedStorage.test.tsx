import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ sign: vi.fn(), user: { id: 'one' } as {id:string}|null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: () => ({ createSignedUrl: mocks.sign }) } } }));
import { protectedStorageObject, resolveProtectedStorageUrl, safeMediaUrl } from '@/lib/protectedStorage';
import { ProtectedStorageUrl } from '@/components/academy/ProtectedStorageUrl';
const base = 'https://vault.supabase.co';
const raw = `${base}/storage/v1/object/public/academy-chat-files/daily-setups/chart%20one.png`;
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.clearAllMocks(); mocks.user={id:'one'}; });
it('recognizes only this backend and protected buckets, decodes paths and discards old tokens', () => {
 expect(protectedStorageObject(raw,base)).toEqual({bucket:'academy-chat-files',path:'daily-setups/chart one.png'});
 expect(protectedStorageObject(raw.replace('/public/','/sign/')+'?token=old',base)?.path).toBe('daily-setups/chart one.png');
 expect(protectedStorageObject(raw.replace(base,'https://attacker.test'),base)).toBeNull();
 expect(protectedStorageObject(raw.replace('academy-chat-files','avatars'),base)).toBeNull();
 expect(safeMediaUrl('javascript:alert(1)')).toBe('');
 expect(safeMediaUrl('https://user:password@example.com')).toBe('');
});
it('never falls back to a public URL when signing is denied', async () => {
 vi.stubEnv('VITE_SUPABASE_URL',base); mocks.sign.mockResolvedValue({error:{message:'denied'},data:null});
 await expect(resolveProtectedStorageUrl(raw)).rejects.toThrow('unavailable');
 render(<ProtectedStorageUrl url={raw}>{url=><img src={url} alt="chart"/>}</ProtectedStorageUrl>);
 await screen.findByText(/File unavailable/); expect(screen.queryByRole('img')).toBeNull();
});
it('rejects a stale signed response after account change', async () => {
 vi.stubEnv('VITE_SUPABASE_URL',base);
 let oldResolve!: (value: unknown) => void;
 mocks.sign.mockReturnValueOnce(new Promise(resolve=>{oldResolve=resolve;})).mockResolvedValue({data:{signedUrl:'https://vault.supabase.co/new'},error:null});
 const view=render(<ProtectedStorageUrl url={raw}>{url=><img src={url} alt="chart"/>}</ProtectedStorageUrl>);
 mocks.user={id:'two'};
 view.rerender(<ProtectedStorageUrl url={raw}>{url=><img src={url} alt="chart"/>}</ProtectedStorageUrl>);
 await waitFor(()=>expect(screen.getByRole('img').getAttribute('src')).toBe('https://vault.supabase.co/new'));
 oldResolve({data:{signedUrl:'https://vault.supabase.co/old'},error:null});
 await waitFor(()=>expect(screen.getByRole('img').getAttribute('src')).toBe('https://vault.supabase.co/new'));
 expect(mocks.sign).toHaveBeenCalledWith('daily-setups/chart one.png',300);
});
