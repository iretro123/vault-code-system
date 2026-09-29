export interface WebSubscription { endpoint: string; keys: { p256dh: string; auth: string } }
/** Never let a client turn the notification worker into an arbitrary HTTP client. */
export function parseWebSubscription(raw: string): WebSubscription | null {
  try {
    if (raw.length > 4096) return null;
    const data = JSON.parse(raw);
    const url = new URL(data.endpoint);
    const allowed = url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com'
      || url.hostname === 'web.push.apple.com' || url.hostname.endsWith('.push.apple.com')
      || url.hostname === 'wns2-par02p.notify.windows.com' || url.hostname.endsWith('.notify.windows.com');
    if (!allowed || url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return null;
    if (!/^[A-Za-z0-9_-]{87}={0,2}$/.test(data.keys?.p256dh ?? '') || !/^[A-Za-z0-9_-]{22}={0,2}$/.test(data.keys?.auth ?? '')) return null;
    return { endpoint: url.href, keys: { p256dh: data.keys.p256dh, auth: data.keys.auth } };
  } catch { return null; }
}
