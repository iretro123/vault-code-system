/** Claim one automatic recovery per tab. Fail closed when storage is unavailable. */
export function claimChunkReload():boolean {
  try {
    const key='__lazy_chunk_reloaded__';
    if(sessionStorage.getItem(key)==='1')return false;
    sessionStorage.setItem(key,'1');
    return true;
  }catch{return false;}
}
