import {afterEach,expect,it,vi} from 'vitest';
import {claimChunkReload,isStaleAssetError} from '../lib/chunkReloadGuard';
afterEach(()=>{vi.restoreAllMocks();sessionStorage.clear();});
it('permits one reload only across repeated failures',()=>{
  sessionStorage.clear();expect(claimChunkReload()).toBe(true);
  for(let i=0;i<10;i++)expect(claimChunkReload()).toBe(false);
});
it('does not reload when storage cannot be read',()=>{
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('Unavailable');});
  expect(claimChunkReload()).toBe(false);
});
it('does not reload when its guard cannot be persisted',()=>{
  sessionStorage.clear();vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('Full');});
  expect(claimChunkReload()).toBe(false);
});
