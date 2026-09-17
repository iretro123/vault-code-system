import { lazy, ComponentType } from "react";
import { claimChunkReload } from './chunkReloadGuard';

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
        if (claimChunkReload()) {
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

/** Explicit recovery only. Do not call on shell mount: a lazy route may still fail. */
export function clearLazyReloadGuard() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // ignore
  }
}
