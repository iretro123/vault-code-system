import puppeteer from '@cloudflare/puppeteer';
import { WorkersWebSocketTransport } from '@cloudflare/puppeteer/internal/cloudflare/WorkersWebSocketTransport.js';

// Capture needs only top-level tabs. Editor/analytics workers can remain in
// discovery after manual maintenance and must not hold chart initialization.
export const captureTargetFilter=target=>['browser','page','tab'].includes(target.type());

// The pinned Cloudflare binding overload drops protocolTimeout. Use its transport
// with public ConnectOptions so a dead renderer cannot outlive the database lease.
export async function connectChartBrowser(binding, sessionId, lifetimeMs=28_000) {
  const startedAt=Date.now();
  let phase='upgrade', upgradeStatus;
  const controller=new AbortController();
  let transport, closed=false, rejectDeadline;
  const closeTransport=()=>{
    if (!transport || closed) return;
    closed=true;
    try { transport.close(); } catch { /* Already closed. */ }
    try { transport.onclose?.(); } catch { /* Reject pending commands safely. */ }
  };
  const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
  const timer=setTimeout(()=>{controller.abort();closeTransport();rejectDeadline(new Error('hosted-browser-timeout'));},lifetimeMs);
  const initialization=setTimeout(()=>{controller.abort();closeTransport();rejectDeadline(new Error('hosted-browser-timeout'));},Math.min(lifetimeMs,10_000));
  // Abort only a pending upgrade, not the established WebSocket six seconds later.
  const bounded={fetch:async(url,init={})=>{
    const handshake=setTimeout(()=>controller.abort(),6000);
    try {const response=await binding.fetch(url,{...init,signal:controller.signal});upgradeStatus=response.status;return response;}
    finally {clearTimeout(handshake);}
  }};
  try {
    transport=await Promise.race([WorkersWebSocketTransport.create(bounded,sessionId).then(value=>{
      transport=value;
      if (controller.signal.aborted) closeTransport();
      return value;
    }),deadline]);
    if (controller.signal.aborted) throw new Error('hosted-browser-timeout');
    phase='initialize';
    const browser=await Promise.race([puppeteer.connect({transport,protocolTimeout:6000,defaultViewport:null,targetFilter:captureTargetFilter}),deadline]);
    clearTimeout(initialization);
    const disconnect=browser.disconnect.bind(browser);
    browser.disconnect=async()=>{clearTimeout(timer);controller.abort();try { await disconnect(); } finally {closeTransport();}};
    return browser;
  } catch(error) {
    // Fixed categories only: provider messages can contain private URLs.
    const reason=/timed? ?out|timeout/i.test(error?.message||'') ? 'timeout' : /closed/i.test(error?.message||'') ? 'closed' : 'protocol';
    console.warn(JSON.stringify({event:'pulse-browser-connect-failed',phase,reason,upgradeStatus,elapsedMs:Date.now()-startedAt}));
    clearTimeout(initialization);clearTimeout(timer);controller.abort();closeTransport();
    throw new Error('hosted-browser-timeout');
  }
}

export async function acquireChartBrowser(binding) {
  const bounded={fetch:(url,init={})=>binding.fetch(url,{...init,signal:AbortSignal.timeout(6000)})};
  return puppeteer.acquire(bounded,{keep_alive:600_000});
}

// Called only under the database's exclusive capture lease. Never create a
// competing chart while the previous dedicated session is still alive.
export async function prepareChartReplacement(env,sessionId) {
  const bounded={fetch:(url,init={})=>env.BROWSER.fetch(url,{...init,signal:AbortSignal.timeout(4000)})};
  const sessions=await puppeteer.sessions(bounded);
  const current=sessions.find(s=>s.sessionId===sessionId);
  if (!current) return;
  if (current.connectionId) throw new Error('hosted-browser-recovering');
  const key=`private:failed-connect:${sessionId}`;
  const failures=Number(await env.CHART_IMAGES.get(key)||0)+1;
  await env.CHART_IMAGES.put(key,String(failures),{expirationTtl:120});
  const retiredAt=Number(await env.CHART_IMAGES.get('private:retired-at')||0);
  if (failures<2 || Date.now()-retiredAt<600000) throw new Error('hosted-browser-recovering');
  const response=await bounded.fetch(`https://fake.host/v1/devtools/browser/${encodeURIComponent(sessionId)}`,{method:'DELETE'});
  if (!response.ok) throw new Error('hosted-browser-recovering');
  await env.CHART_IMAGES.put('private:retired-at',String(Date.now()),{expirationTtl:600});
  const remaining=await puppeteer.sessions(bounded);
  if (remaining.some(s=>s.sessionId===sessionId)) throw new Error('hosted-browser-recovering');
}
