import { expect, it, vi } from 'vitest';
import { cachedProviderToken } from '../../supabase/functions/_shared/providerTokenCache';
it('shares one signing operation across simultaneous devices and warm requests', async () => {
 const load=vi.fn().mockResolvedValue('private-token');
 const get=cachedProviderToken(load,1000,()=>0);
 expect(await Promise.all(Array.from({length:20},()=>get()))).toEqual(Array(20).fill('private-token'));
 await get(); expect(load).toHaveBeenCalledTimes(1);
});
it('refreshes before credential expiry without concurrent duplicate signing', async () => {
 let time=0; const load=vi.fn().mockResolvedValueOnce('first').mockResolvedValue('second');
 const get=cachedProviderToken(load,1000,()=>time);
 expect(await get()).toBe('first'); time=999;expect(await get()).toBe('first');
 time=1000;expect(await Promise.all([get(),get()])).toEqual(['second','second']);expect(load).toHaveBeenCalledTimes(2);
});
it('does not cache failures or missing configuration', async () => {
 const load=vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(null).mockResolvedValue('ready');
 const get=cachedProviderToken(load,1000);
 await expect(get()).rejects.toThrow('unavailable');expect(await get()).toBeNull();expect(await get()).toBe('ready');
});
