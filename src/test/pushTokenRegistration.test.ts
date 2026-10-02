import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),upsert:vi.fn(),remove:vi.fn(),finish:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{},registerPlugin:()=>({})}));
vi.mock('@capacitor/device',()=>({Device:{}}));
vi.mock('@capacitor/push-notifications',()=>({PushNotifications:{}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc,from:()=>({upsert:mocks.upsert,delete:()=>{mocks.remove();const query={eq:()=>query,neq:mocks.finish};return query;}})}}));
import {registerTokenForCurrentUser} from '@/lib/pushPermission';
const params={token:'new-token',userId:'owner',platformKey:'ios:device',basePlatform:'ios'};
beforeEach(()=>{vi.clearAllMocks();vi.spyOn(console,'warn').mockImplementation(()=>{});mocks.rpc.mockResolvedValue({error:{message:'unavailable'}});mocks.upsert.mockResolvedValue({error:null});mocks.finish.mockResolvedValue({error:null});});
afterEach(()=>vi.restoreAllMocks());
it('preserves working tokens and reports failure when fallback save fails',async()=>{
 mocks.upsert.mockResolvedValue({error:{message:'offline'}});
 await expect(registerTokenForCurrentUser(params)).rejects.toThrow('could not be saved');expect(mocks.remove).not.toHaveBeenCalled();
});
it('cleans duplicate and legacy tokens only after successful save',async()=>{
 await expect(registerTokenForCurrentUser(params)).resolves.toBeUndefined();expect(mocks.remove).toHaveBeenCalledTimes(2);expect(mocks.upsert.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
});
it('does not silently report success when duplicate cleanup fails',async()=>{
 mocks.finish.mockResolvedValueOnce({error:{message:'offline'}});
 await expect(registerTokenForCurrentUser(params)).rejects.toThrow('cleanup');expect(mocks.remove).toHaveBeenCalledTimes(1);
});
it('skips fallback after an atomic registration succeeds',async()=>{
 mocks.rpc.mockResolvedValue({error:null});await registerTokenForCurrentUser(params);expect(mocks.upsert).not.toHaveBeenCalled();expect(mocks.remove).not.toHaveBeenCalled();
});
