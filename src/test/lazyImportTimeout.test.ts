import { expect, it, vi } from "vitest";
import { withImportTimeout } from "@/lib/lazyWithRetry";
import { isStaleAssetError } from "@/lib/chunkReloadGuard";

it("a page download that never finishes fails after 10 seconds as a recoverable chunk error", async () => {
  vi.useFakeTimers();
  const p = withImportTimeout(new Promise(() => {}));
  const caught = p.catch((e) => e);
  await vi.advanceTimersByTimeAsync(10000);
  expect(isStaleAssetError(await caught)).toBe(true);
  vi.useRealTimers();
});

it("a page download that finishes is returned unchanged", async () => {
  await expect(withImportTimeout(Promise.resolve(42))).resolves.toBe(42);
});
