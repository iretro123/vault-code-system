/** Claim one automatic recovery per tab. Fail closed when storage is unavailable. */
export function claimChunkReload():boolean {
  try {
    const key='__lazy_chunk_reloaded__';
    if(sessionStorage.getItem(key)==='1')return false;
    sessionStorage.setItem(key,'1');
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
