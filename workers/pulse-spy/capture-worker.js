import { runLiquidityCapture } from './liquidity-capture.js';
import { checkChartConnection, captureAuthorized } from './capture-check.js';
import { drainCaptures } from './capture.js';
import { verifyImageSignature } from './capture-policy.js';
import { archivePendingImages, readCaptureImage } from './image-archive.js';

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
      try {
        const image=await readCaptureImage(env,database(env),id);
        return image ? new Response(image.bytes,{headers:{'Content-Type':image.contentType,'Cache-Control':'private, max-age=60','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Pulse-Image-Source':image.source}}) : new Response('Chart unavailable',{status:404,headers:{'Cache-Control':'no-store'}});
      } catch { return new Response('Chart temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}}); }
    }
    if (request.method==='POST' && url.pathname==='/liquidity' && await captureAuthorized(request,env.WORKER_TOKEN)) {
      const tf=Number(url.searchParams.get('timeframe'));
      if (![5,15].includes(tf)) return Response.json({ok:false,failure:'unsupported-timeframe'},{status:400});
      const result=await runLiquidityCapture(env,database(env),tf,true);
      return Response.json(result,{status:result.ok?200:409,headers:{'Cache-Control':'no-store'}});
    }
    if (request.method==='POST' && url.pathname==='/check' && await captureAuthorized(request,env.WORKER_TOKEN)) {
      const rpc=database(env);
      const claim=await rpc('pulse_spy_capture_probe_claim');
      if (!claim?.lease || claim.busy) return Response.json({ok:false,failure:'capture-busy'},{status:409,headers:{'Cache-Control':'no-store'}});
      const result = await checkChartConnection(env,url.searchParams.has('timeframe') ? Number(url.searchParams.get('timeframe')) : undefined,url.searchParams.get('symbol') || 'AMEX:SPY');
      const finished=await rpc('pulse_spy_capture_finish',{p_lease:claim.lease,p_event_id:null,p_result:{ok:result.ok,failure:result.failure}});
      if (!finished) return Response.json({ok:false,failure:'capture-lease-lost'},{status:409,headers:{'Cache-Control':'no-store'}});
      return Response.json(result,{status:result.ok ? 200 : 409,headers:{'Cache-Control':'no-store'}});
    }
    if (request.method==='POST' && url.pathname==='/drain' && await captureAuthorized(request,env.WORKER_TOKEN)) {
      if (!env.CAPTURE_JOBS) return new Response('Capture queue unavailable',{status:503});
      // The durable consumer owns the browser work and its full lease budget.
      // A former 22s HTTP attempt killed cold switches, consumed an attempt and
      // blocked the queued job behind the same lease. Persist the wake only.
      await env.CAPTURE_JOBS.send({kind:'capture-wake'});
      return new Response(null,{status:202});
    }
    return new Response('Not found',{status:404});
  },
  async scheduled(_event,env,ctx) {
    ctx.waitUntil((async()=>{const rpc=database(env);if(await drainCaptures(env,rpc)) await runLiquidityCapture(env,rpc);})());
    ctx.waitUntil(archivePendingImages(env,database(env)).catch(()=>console.warn('Pulse image archive deferred; next scheduled run will retry.')));
  },
  async queue(batch,env) {
    for (const message of batch.messages) {
      try {
        if (await drainCaptures(env,database(env))) message.ack();
        else message.retry({delaySeconds:2});
      } catch {
        console.warn('Pulse capture will retry; database health monitoring remains active.');
        message.retry({delaySeconds:2});
      }
    }
  },
};
