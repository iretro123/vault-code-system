import { createPulseReceiver } from '../../supabase/functions/_shared/pulse/receiver.ts';
import { PULSE_SPY_SYMBOL, PULSE_QQQ_SYMBOL } from '../../supabase/functions/_shared/pulse/domain.ts';

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/health') return Response.json({ service: 'vault-spy-pulse', screenshotService: env.PULSE_CAPTURE ? 'configured' : 'not-configured' }, { headers: { 'Cache-Control': 'no-store' } });
    if (request.method === 'GET' && path.startsWith('/image/') && env.PULSE_CAPTURE) return env.PULSE_CAPTURE.fetch(request);
    if (request.method === 'POST' && ['/capture/check','/capture/liquidity'].includes(path) && env.PULSE_CAPTURE) {
      // The internal service validates the operator token. Never use webhook
      // delivery credentials as authorization for browser/account operations.
      return env.PULSE_CAPTURE.fetch('https://capture.internal/' + path.split('/').at(-1) + new URL(request.url).search, {
        method:'POST', headers:{Authorization:request.headers.get('Authorization') || ''},
      });
    }
    if (!/^\/webhook\/(?:qqq\/)?[a-f0-9]{64}$/.test(path)) return new Response('Not found', { status: 404 });
    if (!env.WORKER_TOKEN || !env.DELIVERY_HASH || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return new Response('Service unavailable', { status: 503 });
    async function rpc(name, args) {
      const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ p_token: env.WORKER_TOKEN, ...args }), signal: AbortSignal.timeout(2200),
      });
      if (!response.ok) throw new Error('Pulse persistence unavailable');
      return response.json();
    }
    const qqq = path.startsWith('/webhook/qqq/');
    const prefix = qqq ? 'pulse_qqq' : 'pulse_spy';
    const response = await createPulseReceiver({
      authorized: async hash => {
        if (hash.length !== 64 || env.DELIVERY_HASH.length !== 64) return false;
        let difference = 0;
        for (let i = 0; i < 64; i++) difference |= hash.charCodeAt(i) ^ env.DELIVERY_HASH.charCodeAt(i);
        return difference === 0;
      },
      read: timeframe => rpc(`${prefix}_processing_state`, { p_timeframe: timeframe }),
      commit: (revision, snapshot, posts) => rpc(`${prefix}_commit_snapshot`, { p_revision: revision, p_snapshot: snapshot, p_posts: posts }),
    }, () => Date.now(), qqq ? PULSE_QQQ_SYMBOL : PULSE_SPY_SYMBOL)(request);
    // The accepted alert is already durable. Screenshot work cannot delay its ACK.
    if (response.status === 202 && env.PULSE_CAPTURE) ctx.waitUntil((async()=>{
      const accepted=await response.clone().json();
      if (accepted.posts===0) return; // Heartbeats have no new screenshot work.
      const wake=await env.PULSE_CAPTURE.fetch('https://capture.internal/drain', {
        method:'POST', headers:{Authorization:`Bearer ${env.WORKER_TOKEN}`},
      });
      if (!wake.ok) console.warn(JSON.stringify({event:'pulse-capture-wake-rejected',status:wake.status}));
    })().catch(()=>console.warn('Pulse capture wake failed; hosted timer will retry.')));
    return response;
  },
};
