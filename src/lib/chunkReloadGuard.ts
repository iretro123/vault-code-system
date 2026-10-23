/** Allow one automatic recovery per 2 minutes per tab: no reload loops, yet a long-open tab can recover again later. Fail closed when storage is unavailable. */
export const CHUNK_RELOAD_COOLDOWN_MS = 120_000;
export function claimChunkReload(now: number = Date.now()):boolean {
  try {
    const key='__lazy_chunk_reloaded__';
    const last=Number(sessionStorage.getItem(key));
    if(last>0 && now-last<CHUNK_RELOAD_COOLDOWN_MS)return false;
    sessionStorage.setItem(key,String(now));
    return true;
  }catch{return false;}
}

/** True when an error comes from a stale deploy (missing JS chunk or CSS asset). */
export function isStaleAssetError(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message ?? "";
  return (
    /Importing a module script failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Unable to preload CSS/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    (err as { name?: string } | null)?.name === "ChunkLoadError"
  );
}
