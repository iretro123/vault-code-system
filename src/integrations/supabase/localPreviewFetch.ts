import { Capacitor } from '@capacitor/core';

/** Keep local web previews read-only, including production-build previews.
 * Native Capacitor apps also use localhost but are not design previews.
 */
export const isLocalDesignPreview = () => !Capacitor.isNativePlatform() &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const localPreviewFetch: typeof fetch = async (input, init) => {
  if (isLocalDesignPreview()) {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const read = method === 'GET' || method === 'HEAD';
    // Audited read-only endpoint: checks entitlement and returns a short-lived PDF URL.
    const playbookRead = url.pathname === '/functions/v1/playbook-signed-url' && method === 'POST';
    // Audited giphy-search only authenticates and reads GIPHY; it never posts a message.
    const gifRead = url.pathname === '/functions/v1/giphy-search' && method === 'POST';
    // SQL STABLE, SELECT-only profile lookup. Only GET is allowed here.
    const profileRead = url.pathname === '/rest/v1/rpc/get_community_profiles' && method === 'GET';
    const blocked = (url.pathname.startsWith('/functions/v1/') && !playbookRead && !gifRead) ||
      (url.pathname.startsWith('/rest/v1/rpc/') && !profileRead) ||
      (!read && (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/storage/v1/')));
    if (blocked) return new Response(JSON.stringify({message:'Local design preview is read-only. Live writes and server actions are disabled.',code:'LOCAL_PREVIEW_READ_ONLY'}),{status:403,headers:{'Content-Type':'application/json'}});
  }
  return fetch(input, init);
};
