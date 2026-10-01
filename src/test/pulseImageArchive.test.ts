import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {archivePendingImages,imageDigest,readCaptureImage} from '../../workers/pulse-spy/image-archive.js';
const id='cfcbf935-e986-4a6b-b731-d7db267c4f62';
const png=new Uint8Array(12000);png.set([137,80,78,71,13,10,26,10]);
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));
afterEach(()=>vi.unstubAllGlobals());
describe('independent private image archive',()=>{
 it('copies registered originals with a checksum and never changes event state',async()=>{
  const rpc=vi.fn().mockResolvedValueOnce([{imageId:id}]).mockResolvedValueOnce(true);
  const env={CHART_IMAGES:{get:vi.fn().mockResolvedValue(png.buffer)}};
  expect(await archivePendingImages(env,rpc)).toEqual({archived:1,failed:0});
  expect(rpc).toHaveBeenLastCalledWith('pulse_image_archive_put',{p_image_id:id,p_png:Buffer.from(png).toString('base64'),p_sha256:await imageDigest(png)},8000);
  expect(rpc.mock.calls.some(([name])=>name==='pulse_spy_capture_finish')).toBe(false);
 });
 it('records a retry for unavailable originals and continues to the next image',async()=>{
  const rpc=vi.fn().mockResolvedValueOnce([{imageId:id},{imageId:'next'}]).mockResolvedValue(true);
  const env={CHART_IMAGES:{get:vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(png.buffer)}};
  expect(await archivePendingImages(env,rpc)).toEqual({archived:1,failed:1});
  expect(rpc).toHaveBeenCalledWith('pulse_image_archive_retry',{p_image_id:id,p_failure:'primary-image-unavailable'});
 });
 it('serves the same original from the archive when primary storage throws',async()=>{
  const rpc=vi.fn().mockResolvedValue({png:Buffer.from(png).toString('base64'),sha256:await imageDigest(png)});
  const env={CHART_IMAGES:{getWithMetadata:vi.fn().mockRejectedValue(new Error('outage'))}};
  const image=await readCaptureImage(env,rpc,id);
  expect(image?.source).toBe('archive');expect(image?.bytes).toEqual(png);
  expect(rpc).toHaveBeenCalledWith('pulse_image_archive_get',{p_image_id:id});
 });
 it('uses the archive on a primary miss but rejects corrupted backup data',async()=>{
  const env={CHART_IMAGES:{getWithMetadata:vi.fn().mockResolvedValue({value:null})}};
  const rpc=vi.fn().mockResolvedValue({png:Buffer.from(png).toString('base64'),sha256:'0'.repeat(64)});
  await expect(readCaptureImage(env,rpc,id)).rejects.toThrow('archive-image-invalid');
 });
 it('does not query backup storage when the primary image exists',async()=>{
  const rpc=vi.fn();const env={CHART_IMAGES:{getWithMetadata:vi.fn().mockResolvedValue({value:png,metadata:null})}};
  expect((await readCaptureImage(env,rpc,id))?.source).toBe('primary');expect(rpc).not.toHaveBeenCalled();
 });
 it('preserves older JPEG originals without converting them',async()=>{
  const jpeg=new Uint8Array(12000);jpeg.set([255,216,255]);jpeg.set([255,217],jpeg.length-2);
  const env={CHART_IMAGES:{getWithMetadata:vi.fn().mockResolvedValue({value:null})}};
  const rpc=vi.fn().mockResolvedValue({png:Buffer.from(jpeg).toString('base64'),sha256:await imageDigest(jpeg),contentType:'image/jpeg'});
  const recovered=await readCaptureImage(env,rpc,id);
  expect(recovered?.bytes).toEqual(jpeg);expect(recovered?.contentType).toBe('image/jpeg');
 });
});
