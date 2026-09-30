import puppeteer from '@cloudflare/puppeteer';
import { WorkersWebSocketTransport } from '@cloudflare/puppeteer/internal/cloudflare/WorkersWebSocketTransport.js';

// The pinned Cloudflare binding overload drops protocolTimeout. Use its transport
// with public ConnectOptions so a dead renderer cannot outlive the database lease.
export async function connectChartBrowser(binding, sessionId, lifetimeMs=28_000) {
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
  // Abort only a pending upgrade, not the established WebSocket six seconds later.
  const bounded={fetch:async(url,init={})=>{
    const handshake=setTimeout(()=>controller.abort(),6000);
    try {return await binding.fetch(url,{...init,signal:controller.signal});}
    finally {clearTimeout(handshake);}
  }};
  try {
    transport=await Promise.race([WorkersWebSocketTransport.create(bounded,sessionId).then(value=>{
      transport=value;
      if (controller.signal.aborted) closeTransport();
      return value;
    }),deadline]);
    if (controller.signal.aborted) throw new Error('hosted-browser-timeout');
    const browser=await Promise.race([puppeteer.connect({transport,protocolTimeout:6000,defaultViewport:null}),deadline]);
    const disconnect=browser.disconnect.bind(browser);
    browser.disconnect=async()=>{clearTimeout(timer);controller.abort();try { await disconnect(); } finally {closeTransport();}};
    return browser;
  } catch {
    clearTimeout(timer);controller.abort();closeTransport();
    throw new Error('hosted-browser-timeout');
  }
}

export async function acquireChartBrowser(binding) {
  const bounded={fetch:(url,init={})=>binding.fetch(url,{...init,signal:AbortSignal.timeout(6000)})};
  return puppeteer.acquire(bounded,{keep_alive:600_000});
}
