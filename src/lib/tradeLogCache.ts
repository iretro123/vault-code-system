/** Remove sensitive trade caches on sign-out, or only the resetting user's cache. */
export function clearTradeLogCache(userId?: string) {
  try {
    const prefix = 'va_cache_trade_entries';
    const keys = Array.from({length: localStorage.length}, (_, index) => localStorage.key(index));
    for (const key of keys) {
      if (key === prefix || key === `${prefix}_ts` || (key && (userId ? key === `${prefix}:${userId}` : key.startsWith(`${prefix}:`)))) {
        localStorage.removeItem(key);
      }
    }
  } catch { /* Storage may be unavailable; logout/reset must still finish. */ }
}
