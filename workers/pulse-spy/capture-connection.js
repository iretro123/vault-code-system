import puppeteer from '@cloudflare/puppeteer';
import { WorkersWebSocketTransport } from '@cloudflare/puppeteer/internal/cloudflare/WorkersWebSocketTransport.js';

// The pinned Cloudflare binding overload drops protocolTimeout. Use its transport
// with public ConnectOptions so a dead renderer cannot outlive the database lease.
export async function connectChartBrowser(binding, sessionId, lifetimeMs=28_000) {
  const controller=new AbortController();
  let transport;
  const closeTransport=()=>{if (transport) {transport.close();transport.onclose?.();}};
  const timer=setTimeout(()=>{controller.abort();closeTransport();},lifetimeMs);
  const bounded={fetch:(url,init={})=>binding.fetch(url,{...init,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(6000)])})};
  try {
    transport=await WorkersWebSocketTransport.create(bounded,sessionId);
    if (controller.signal.aborted) throw new Error('hosted-browser-timeout');
    const browser=await puppeteer.connect({transport,protocolTimeout:6000,defaultViewport:null});
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
