/** Share one provider credential across concurrent devices in a warm worker.
 * Never log or persist the token. Failed/missing credentials are not cached.
 */
export function cachedProviderToken(load: () => Promise<string | null>, lifetimeMs: number, now = Date.now) {
  let token: string | null = null;
  let expiresAt = 0;
  let pending: Promise<string | null> | null = null;
  return () => {
    if (token && now() < expiresAt) return Promise.resolve(token);
    if (pending) return pending;
    const startedAt = now();
    pending = Promise.resolve().then(load).then(value => {
      token = value;
      expiresAt = value ? startedAt + lifetimeMs : 0;
      return value;
    }).finally(() => { pending = null; });
    return pending;
  };
}
