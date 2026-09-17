import { describe, it, expect, vi } from "vitest";
import { cleanupAccountStorage, type OwnedUpload } from "../../supabase/functions/_shared/accountStorageCleanup";
const user = "00000000-0000-4000-a000-000000000001";
describe("account upload cleanup", () => {
  it("removes exact paths by bucket then verifies there are no files left", async () => {
    const listOwned = vi.fn().mockResolvedValueOnce([
      { bucket_id: "vault-member-files", name: `conversation/${user}/image.png` },
      { bucket_id: "avatars", name: `${user}/avatar.png` },
    ]).mockResolvedValueOnce([]);
    const remove = vi.fn().mockResolvedValue(undefined);
    expect(await cleanupAccountStorage({ listOwned, remove }, user)).toBe(2);
    expect(remove).toHaveBeenCalledWith("avatars", [`${user}/avatar.png`]);
    expect(listOwned).toHaveBeenCalledTimes(2);
    expect(listOwned).toHaveBeenCalledWith(user);
  });
  it("continues batches without deletion-offset skips", async () => {
    let files: OwnedUpload[] = Array.from({ length: 405 }, (_, i) => ({ bucket_id: "avatars", name: `${user}/${i}.png` }));
    const listOwned = vi.fn(async () => files.slice(0, 200));
    const remove = vi.fn(async (_bucket, paths: string[]) => { files = files.filter(x => !paths.includes(x.name)); });
    expect(await cleanupAccountStorage({ listOwned, remove }, user)).toBe(405);
    expect(remove).toHaveBeenCalledTimes(3);
  });
  it("is idempotent when the account has no uploads", async () => {
    const remove = vi.fn();
    expect(await cleanupAccountStorage({ listOwned: async () => [], remove }, user)).toBe(0);
    expect(remove).not.toHaveBeenCalled();
  });
  it("fails closed on unavailable inventory", async () => {
    const remove = vi.fn();
    await expect(cleanupAccountStorage({ listOwned: async () => { throw Error("missing RPC"); }, remove }, user)).rejects.toThrow();
    expect(remove).not.toHaveBeenCalled();
  });
  it("propagates storage removal failure", async () => {
    await expect(cleanupAccountStorage({ listOwned: async () => [{ bucket_id: "avatars", name: "one" }], remove: async () => { throw Error("offline"); } }, user)).rejects.toThrow("offline");
  });
  it("rejects unrelated course assets before making any removal", async () => {
    const remove = vi.fn();
    await expect(cleanupAccountStorage({ listOwned: async () => [{ bucket_id: "playbook", name: "course.pdf" }], remove }, user)).rejects.toThrow("Unexpected");
    expect(remove).not.toHaveBeenCalled();
  });
  it("stops if provider success does not actually remove the object", async () => {
    const remove = vi.fn();
    await expect(cleanupAccountStorage({ listOwned: async () => [{ bucket_id: "avatars", name: "one" }], remove }, user)).rejects.toThrow("no progress");
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it("rejects an invalid user before querying storage", async () => {
    const listOwned = vi.fn();
    await expect(cleanupAccountStorage({ listOwned, remove: vi.fn() }, "other-user")).rejects.toThrow("Invalid account");
    expect(listOwned).not.toHaveBeenCalled();
  });
});
