import { lazy, ComponentType } from "react";

const RELOAD_KEY = "__lazy_chunk_reloaded__";

function isChunkLoadError(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message ?? "";
  return (
    /Importing a module script failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    (err as { name?: string } | null)?.name === "ChunkLoadError"
  );
}

/**
 * Wrap React.lazy so that a stale-deploy chunk-hash mismatch
 * triggers ONE automatic page reload (guarded by sessionStorage)
 * instead of permanently breaking the route.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (isChunkLoadError(err)) {
        let alreadyReloaded = false;
        try {
          alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === "1";
        } catch {
          // sessionStorage unavailable — fall through to rethrow
        }
        if (!alreadyReloaded) {
          try {
            sessionStorage.setItem(RELOAD_KEY, "1");
          } catch {
            // ignore
          }
          window.location.reload();
          // Return a never-resolving promise so React shows Suspense
          // fallback until the reload kicks in.
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}

/** Clear the reload guard after a successful render — call once at app mount. */
export function clearLazyReloadGuard() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // ignore
  }
}
