import { supabase } from "@/integrations/supabase/client";

const STORAGE_PUBLIC_SEGMENT = "/storage/v1/object/public/";
const STORAGE_SIGNED_SEGMENT = "/storage/v1/object/sign/";

function stripQueryString(value: string) {
  const qIndex = value.indexOf("?");
  return qIndex >= 0 ? value.slice(0, qIndex) : value;
}

export function extractStoragePathFromUrl(bucket: string, value: string) {
  const normalized = stripQueryString(value);
  const publicNeedle = `${STORAGE_PUBLIC_SEGMENT}${bucket}/`;
  const signedNeedle = `${STORAGE_SIGNED_SEGMENT}${bucket}/`;

  const publicIndex = normalized.indexOf(publicNeedle);
  if (publicIndex >= 0) {
    return normalized.slice(publicIndex + publicNeedle.length);
  }

  const signedIndex = normalized.indexOf(signedNeedle);
  if (signedIndex >= 0) {
    return normalized.slice(signedIndex + signedNeedle.length);
  }

  return null;
}

export async function resolvePrivateStorageUrl(bucket: string, value: string | null | undefined, expiresIn = 3600) {
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(value, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  }

  const parsedPath = extractStoragePathFromUrl(bucket, value);
  if (!parsedPath) {
    return value;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(parsedPath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
