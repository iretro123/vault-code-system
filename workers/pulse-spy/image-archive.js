import { Buffer } from 'node:buffer';

const PNG = [137,80,78,71,13,10,26,10];
function imageType(bytes) {
  if (bytes.byteLength<10_000 || bytes.byteLength>8_000_000) return null;
  if (PNG.every((v,i)=>bytes[i]===v)) return 'image/png';
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255 && bytes.at(-2)===255 && bytes.at(-1)===217) return 'image/jpeg';
  return null;
}
export async function imageDigest(bytes) {
  return Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
}

// Runs independently of browser capture and never changes event timestamps,
// readiness, or alert delivery. The database owns the pending list and retries.
export async function archivePendingImages(env,rpc) {
  const pending=await rpc('pulse_image_archive_pending');
  let archived=0,failed=0;
  const deadline=Date.now()+20_000;
  for (const item of pending) {
    if (Date.now()>deadline) break;
    let failure='archive-write-unavailable';
    try {
      const value=await env.CHART_IMAGES.get(item.imageId,'arrayBuffer');
      if (!value) { failure='primary-image-unavailable'; throw new Error(failure); }
      const bytes=new Uint8Array(value);
      if (!imageType(bytes)) { failure='archive-image-invalid'; throw new Error(failure); }
      const ok=await rpc('pulse_image_archive_put',{p_image_id:item.imageId,p_png:Buffer.from(bytes).toString('base64'),p_sha256:await imageDigest(bytes)},8000);
      if (!ok) throw new Error('archive-write-unavailable');
      archived++;
    } catch {
      failed++;
      await rpc('pulse_image_archive_retry',{p_image_id:item.imageId,p_failure:failure});
    }
  }
  console.info(JSON.stringify({event:'pulse-image-archive',archived,failed}));
  return {archived,failed};
}

export async function readArchivedImage(rpc,id) {
  const image=await rpc('pulse_image_archive_get',{p_image_id:id});
  if (!image) return null;
  const bytes=new Uint8Array(Buffer.from(image.png,'base64'));
  const contentType=imageType(bytes);
  if (!contentType || (image.contentType && contentType!==image.contentType) || await imageDigest(bytes)!==image.sha256) throw new Error('archive-image-invalid');
  return {bytes,contentType};
}

export async function readCaptureImage(env,rpc,id) {
  try {
    const image=await env.CHART_IMAGES.getWithMetadata(id,'arrayBuffer');
    if (image.value) return {bytes:image.value,contentType:image.metadata?.contentType==='image/jpeg'?'image/jpeg':'image/png',source:'primary'};
  } catch { /* A primary outage must still permit the independently stored original. */ }
  const image=await readArchivedImage(rpc,id);
  return image ? {...image,source:'archive'} : null;
}
