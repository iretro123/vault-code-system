import { checkChartConnection, captureAuthorized } from './capture-check.js';
import { drainCaptures, runCapture } from './capture.js';
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
      return image.value ? new Response(image.value,{headers:{'Content-Type':contentType,'Cache-Control':'private, max-age=60','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}}) : new Response('Chart unavailable',{status:404,headers:{'Cache-Control':'no-store'}});
    }
    if (request.method==='POST' && url.pathname==='/check' && await captureAuthorized(request,env.WORKER_TOKEN)) {
      const rpc=database(env);
      const claim=await rpc('pulse_spy_capture_probe_claim');
      if (!claim?.lease || claim.busy) return Response.json({ok:false,failure:'capture-busy'},{status:409,headers:{'Cache-Control':'no-store'}});
      const result = await checkChartConnection(env,url.searchParams.has('timeframe') ? Number(url.searchParams.get('timeframe')) : undefined);
      const finished=await rpc('pulse_spy_capture_finish',{p_lease:claim.lease,p_event_id:null,p_result:{ok:result.ok,failure:result.failure}});
      if (!finished) return Response.json({ok:false,failure:'capture-lease-lost'},{status:409,headers:{'Cache-Control':'no-store'}});
      return Response.json(result,{status:result.ok ? 200 : 409,headers:{'Cache-Control':'no-store'}});
    }
    if (request.method==='POST' && url.pathname==='/drain' && await captureAuthorized(request,env.WORKER_TOKEN)) {
      if (!env.CAPTURE_JOBS) return new Response('Capture queue unavailable',{status:503});
      // Persist recovery first. A single opportunistic capture avoids queue
      // scheduling latency. Never drain multiple jobs in the HTTP lifetime:
      // the durable consumer resumes contention, failure or termination.
      await env.CAPTURE_JOBS.send({kind:'capture-wake'});
      const started=Date.now();
      ctx.waitUntil(runCapture(env,database(env),22_000)
        .then(result=>console.info(JSON.stringify({event:'pulse-capture-immediate',result,elapsedMs:Date.now()-started})))
        .catch(()=>console.warn('Pulse immediate capture deferred to durable queue.')));
      return new Response(null,{status:202});
    }
    return new Response('Not found',{status:404});
  },
  async scheduled(_event,env,ctx) {
    ctx.waitUntil(drainCaptures(env,database(env)));
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
