import { afterEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({add:vi.fn()}));
vi.mock('@capacitor/app',()=>({App:{addListener:m.add}}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true}}));
import {onNativeAppState} from '@/lib/appResume';
afterEach(()=>vi.clearAllMocks());
it('handles native resume and removes its listener',async()=>{
 const remove=vi.fn();const callback=vi.fn();m.add.mockResolvedValue({remove});
 const dispose=onNativeAppState(callback);await Promise.resolve();
 m.add.mock.calls[0][1]({isActive:true});expect(callback).toHaveBeenCalledWith(true);
 dispose();m.add.mock.calls[0][1]({isActive:false});expect(callback).toHaveBeenCalledTimes(1);expect(remove).toHaveBeenCalledOnce();
});
it('removes a listener that resolves after unmount',async()=>{
 let resolve!: (value:unknown)=>void;const remove=vi.fn();m.add.mockImplementation(()=>new Promise(r=>resolve=r));
 onNativeAppState(vi.fn())();resolve({remove});await Promise.resolve();expect(remove).toHaveBeenCalledOnce();
});
