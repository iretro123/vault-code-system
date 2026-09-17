// Inventory is service-only; remove through Storage API, never DELETE storage.objects.
export type OwnedUpload = { bucket_id: string; name: string };
export interface StorageCleanupPort {
  listOwned: (userId: string) => Promise<OwnedUpload[]>;
  remove: (bucket: string, paths: string[]) => Promise<void>;
}
export const PERSONAL_UPLOAD_BUCKETS = new Set([
  "avatars", "academy-chat-files", "ticket-screenshots", "trade-screenshots", "vault-member-files",
]);

export async function cleanupAccountStorage(port: StorageCleanupPort, userId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error("Invalid account ID");
  }
  let deleted = 0;
  let previous = "";
  // Always fetch the first remaining batch; offsets would skip files as removal proceeds.
  for (let batch = 0; batch < 100; batch++) {
    const objects = await port.listOwned(userId);
    if (!Array.isArray(objects) || objects.length > 200) throw new Error("Invalid storage inventory");
    if (!objects.length) return deleted;
    const groups = new Map<string, Set<string>>();
    for (const object of objects) {
      if (!PERSONAL_UPLOAD_BUCKETS.has(object.bucket_id) || typeof object.name !== "string" || !object.name || object.name.includes("\0")) {
        throw new Error("Unexpected account storage object");
      }
      const paths = groups.get(object.bucket_id) ?? new Set<string>();
      paths.add(object.name);
      groups.set(object.bucket_id, paths);
    }
    const fingerprint = JSON.stringify(objects);
    if (fingerprint === previous) throw new Error("Storage cleanup made no progress");
    previous = fingerprint;
    for (const [bucket, paths] of groups) {
      await port.remove(bucket, [...paths]);
      deleted += paths.size;
    }
  }
  throw new Error("Storage cleanup incomplete; retry required");
}
