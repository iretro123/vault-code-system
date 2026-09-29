import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { isLocalDesignPreview } from '@/integrations/supabase/localPreviewFetch';

export function supportsWebPush() {
  return !Capacitor.isNativePlatform() && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
async function platformKey(subscription: PushSubscription) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subscription.endpoint));
  return 'web:' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
async function save(subscription: PushSubscription) {
  const { error } = await supabase.rpc('register_device_token', { _token: JSON.stringify(subscription.toJSON()), _platform: await platformKey(subscription) });
  if (error) throw new Error('Browser alerts could not be connected. Please try again.');
}
export async function enableWebPush(): Promise<boolean> {
  if (!supportsWebPush() || isLocalDesignPreview()) return false;
  if (await Notification.requestPermission() !== 'granted') return false;
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-push-config`, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
  if (!response.ok) throw new Error('Browser alerts are not configured yet. Your in-app inbox is available.');
  const { publicKey } = await response.json();
  if (!publicKey) return false;
  const registration = await navigator.serviceWorker.register('/vault-push-sw.js');
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const decoded = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/'));
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(decoded, c => c.charCodeAt(0)) });
  }
  await save(subscription);
  return true;
}
export async function syncExistingWebPush() {
  if (!supportsWebPush() || isLocalDesignPreview() || Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) await save(subscription);
}
export async function hasWebPushSubscription() {
  if (!supportsWebPush()) return false;
  return !!await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();
}
export async function disableWebPush() {
  if (!supportsWebPush()) return;
  const subscription = await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();
  if (!subscription) return;
  const key = await platformKey(subscription);
  // Unsubscribe at the browser provider even if the backend/network is unavailable.
  await subscription.unsubscribe();
  await supabase.rpc('unregister_device_token', { _platform: key });
}
