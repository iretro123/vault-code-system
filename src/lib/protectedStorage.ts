import { supabase } from '@/integrations/supabase/client';

const protectedBuckets = new Set(['academy-chat-files', 'toolkit-files', 'playbook']);
/** Existing public URLs remain stable object references, never access grants. */
export function protectedStorageObject(raw: string, origin = import.meta.env.VITE_SUPABASE_URL) {
  try {
    const url = new URL(raw);
    if (url.origin !== new URL(origin).origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!match || !protectedBuckets.has(match[1])) return null;
    const path = decodeURIComponent(match[2]);
    if (path.split('/').some(part => part === '..' || part === '.')) return null;
    return { bucket: match[1], path };
  } catch { return null; }
}
export function safeMediaUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
export async function resolveProtectedStorageUrl(raw: string) {
  const object = protectedStorageObject(raw);
  if (!object) return safeMediaUrl(raw);
  const { data, error } = await supabase.storage.from(object.bucket).createSignedUrl(object.path, 300);
  if (error || !data?.signedUrl) throw new Error('This file is unavailable or your access has changed.');
  return data.signedUrl;
}
