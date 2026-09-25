import { createPulseReceiver } from '../../supabase/functions/_shared/pulse/receiver.ts';
import { PULSE_SPY_SYMBOL } from '../../supabase/functions/_shared/pulse/domain.ts';

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/health') return Response.json({ service: 'vault-spy-pulse', screenshotService: 'not-connected' }, { headers: { 'Cache-Control': 'no-store' } });
    if (!/^\/webhook\/[a-f0-9]{64}$/.test(path)) return new Response('Not found', { status: 404 });
    if (!env.WORKER_TOKEN || !env.DELIVERY_HASH || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return new Response('Service unavailable', { status: 503 });
    async function rpc(name, args) {
      const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ p_token: env.WORKER_TOKEN, ...args }), signal: AbortSignal.timeout(2200),
      });
      if (!response.ok) throw new Error('Pulse persistence unavailable');
      return response.json();
    }
    return createPulseReceiver({
      authorized: async hash => {
        if (hash.length !== 64 || env.DELIVERY_HASH.length !== 64) return false;
        let difference = 0;
        for (let i = 0; i < 64; i++) difference |= hash.charCodeAt(i) ^ env.DELIVERY_HASH.charCodeAt(i);
        return difference === 0;
      },
      read: timeframe => rpc('pulse_spy_processing_state', { p_timeframe: timeframe }),
      commit: (revision, snapshot, posts) => rpc('pulse_spy_commit_snapshot', { p_revision: revision, p_snapshot: snapshot, p_posts: posts }),
    }, () => Date.now(), PULSE_SPY_SYMBOL)(request);
  },
};
