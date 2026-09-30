import { connectChartBrowser, acquireChartBrowser } from './capture-connection.js';
import { CHART_URL } from './capture-policy.js';
import { reconnectChart } from './capture-reconnect.js';

const encoder=new TextEncoder();
const hexBytes=value=>Uint8Array.from(value.match(/../g),part=>parseInt(part,16));
async function authKey(env, usage) {
  if (!/^[a-f0-9]{64}$/.test(env.CAPTURE_AUTH_KEY||'')) throw new Error('hosted-chart-login-required');
  return crypto.subtle.importKey('raw',hexBytes(env.CAPTURE_AUTH_KEY),'AES-GCM',false,[usage]);
}

export async function openChartSession(env, lifetimeMs=28_000) {
  const deadline=Date.now()+lifetimeMs;
  const sessionId=await env.CHART_IMAGES.get('private:session') || env.CAPTURE_SESSION_ID;
  if (sessionId) {
    let existing;
    try { existing=await connectChartBrowser(env.BROWSER,sessionId,Math.max(1,deadline-Date.now())); } catch { /* Restore an expired browser using the approved saved login. */ }
    if (existing) {
      try {
        const page=(await existing.pages()).find(p=>p.url().startsWith(CHART_URL));
        if (!page) throw new Error('hosted-chart-login-required');
        await reconnectChart(env,page);
        return existing;
      } catch(error) {
        await existing.disconnect();
        // Account conflicts and login challenges must not trigger browser churn.
        if (['chart-session-conflict','hosted-chart-login-required'].includes(error?.message)) throw error;
      }
    }
  }
  if (env.CAPTURE_SAVE_LOGIN!=='true') throw new Error('hosted-chart-login-required');
  const sealed=await env.CHART_IMAGES.get('private:login','arrayBuffer');
  if (!sealed) throw new Error('hosted-chart-login-required');
  const bytes=new Uint8Array(sealed);
  const json=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},await authKey(env,'decrypt'),bytes.slice(12));
  const cookies=JSON.parse(new TextDecoder().decode(json));
  if (!Array.isArray(cookies) || !cookies.length || cookies.some(c=>!/^\.?((www\.)?tradingview\.com)$/.test(c.domain))) throw new Error('hosted-chart-login-required');
  if (deadline-Date.now()<8000) throw new Error('hosted-browser-timeout');
  // Bound replacement attempts; never create a new browser every queue retry.
  const restoredAt=Number(await env.CHART_IMAGES.get('private:restore-at')||0);
  if (Date.now()-restoredAt<60_000) throw new Error('hosted-browser-recovering');
  await env.CHART_IMAGES.put('private:restore-at',String(Date.now()),{expirationTtl:60});
  let acquired;
  try { acquired=await acquireChartBrowser(env.BROWSER); } catch { throw new Error('browser-acquire-unavailable'); }
  const browser=await connectChartBrowser(env.BROWSER,acquired.sessionId,Math.max(1,deadline-Date.now()));
  let stage='restore-page';
  try {
    const page=await browser.newPage();
    stage='restore-cookies';
    await page.setCookie(...cookies);
    stage='restore-navigation';
    await page.goto(CHART_URL,{waitUntil:'domcontentloaded',timeout:12_000});
    stage='restore-chart';
    await page.waitForSelector('.chart-widget canvas[aria-label]',{timeout:12_000});
    stage='restore-reconnect';
    await reconnectChart(env,page);
    await env.CHART_IMAGES.put('private:session',acquired.sessionId);
    return browser;
  } catch(error) { try { await browser.close(); } finally { await browser.disconnect(); } throw new Error(error?.message==='chart-session-conflict' ? error.message : stage+'-failed'); }
}

export async function rememberChartLogin(env,page) {
  // Off by default. Enable only after the owner explicitly approves keeping this
  // dedicated TradingView login encrypted in their Cloudflare account.
  if (env.CAPTURE_SAVE_LOGIN!=='true') return;
  const updated=Number(await env.CHART_IMAGES.get('private:login-saved-at')||0);
  if (Date.now()-updated<6*3600_000) return;
  const cookies=(await page.cookies('https://www.tradingview.com/')).filter(c=>/^\.?((www\.)?tradingview\.com)$/.test(c.domain));
  if (!cookies.length) throw new Error('hosted-chart-login-required');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await authKey(env,'encrypt'),encoder.encode(JSON.stringify(cookies)));
  const sealed=new Uint8Array(12+encrypted.byteLength);sealed.set(iv);sealed.set(new Uint8Array(encrypted),12);
  await env.CHART_IMAGES.put('private:login',sealed,{expirationTtl:30*24*3600});
  await env.CHART_IMAGES.put('private:login-saved-at',String(Date.now()),{expirationTtl:30*24*3600});
}
