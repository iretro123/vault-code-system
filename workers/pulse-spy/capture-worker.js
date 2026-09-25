import { runCapture } from './capture.js';
import { verifyImageSignature } from './capture-policy.js';

function database(env) {
  return async (name,args={},timeout=5000) => {
    const response=await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`,{
      method:'POST',headers:{'Content-Type':'application/json',apikey:env.SUPABASE_PUBLISHABLE_KEY},
      body:JSON.stringify({p_token:env.WORKER_TOKEN,...args}),signal:AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new Error('Capture persistence unavailable');
    return response.json();
  };
}

export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if (request.method==='GET' && url.pathname.startsWith('/image/')) {
      const id=url.pathname.slice(7);
      if (!await verifyImageSignature(id,url.searchParams.get('expires'),url.searchParams.get('signature'),env.IMAGE_SIGNING_KEY)) return new Response('Not authorized',{status:403,headers:{'Cache-Control':'no-store'}});
      const image=await env.CHART_IMAGES.getWithMetadata(id,'arrayBuffer');
      const contentType=image.metadata?.contentType==='image/jpeg' ? 'image/jpeg' : 'image/png';
      return image.value ? new Response(image.value,{headers:{'Content-Type':contentType,'Cache-Control':'private, max-age=60','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}}) : new Response('Chart unavailable',{status:404});
    }
    if (request.method==='POST' && url.pathname==='/drain' && request.headers.get('Authorization')===`Bearer ${env.WORKER_TOKEN}` && env.WORKER_TOKEN) {
      ctx.waitUntil(runCapture(env,database(env)).catch(()=>console.warn('Pulse capture job did not complete; durable lease will recover.')));
      return new Response(null,{status:202});
    }
    return new Response('Not found',{status:404});
  },
  async scheduled(_event,env,ctx) {
    ctx.waitUntil(runCapture(env,database(env)));
  },
};
