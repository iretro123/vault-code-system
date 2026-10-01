import { connectChartBrowser, acquireChartBrowser, prepareChartReplacement } from './capture-connection.js';
import { CHART_URL } from './capture-policy.js';
import { reconnectChart } from './capture-reconnect.js';

const encoder=new TextEncoder();
// Explicit authorization is a deadline, never a rolling 30-day renewal.
export function loginRecoveryExpiry(env,now=Date.now()) {
  const expiry=Date.parse(env.CAPTURE_LOGIN_APPROVED_UNTIL || '');
  return Number.isFinite(expiry) && expiry>now && expiry-now<=30*86400_000 ? Math.floor(expiry/1000) : null;
}
const hexBytes=value=>Uint8Array.from(value.match(/../g),part=>parseInt(part,16));
async function authKey(env, usage) {
  if (!/^[a-f0-9]{64}$/.test(env.CAPTURE_AUTH_KEY||'')) throw new Error('hosted-chart-login-required');
  return crypto.subtle.importKey('raw',hexBytes(env.CAPTURE_AUTH_KEY),'AES-GCM',false,[usage]);
}

export async function openChartSession(env, lifetimeMs=34_000) {
  const deadline=Date.now()+lifetimeMs;
  const sessionId=await env.CHART_IMAGES.get('private:session') || env.CAPTURE_SESSION_ID;
  if (sessionId) {
    let existing;
    try { existing=await connectChartBrowser(env.BROWSER,sessionId,Math.max(1,deadline-Date.now())); } catch { /* Restore an expired browser using the approved saved login. */ }
    if (existing) {
      let stage='pages';
      try {
        const pages=await existing.pages();
        let page=pages.find(p=>p.url().startsWith(CHART_URL));
        const restoring=await env.CHART_IMAGES.get('private:restoring-session')===sessionId;
        if (!page && restoring) {
          page=pages.find(p=>p.url()==='about:blank');
          if (page) await page.goto(CHART_URL,{waitUntil:'domcontentloaded',timeout:12_000});
        }
        if (!page) throw new Error('hosted-chart-login-required');
        stage='foreground';
        await page.bringToFront();
        stage='reconnect';
        await reconnectChart(env,page);
        stage='ready';
        if (restoring) await page.waitForSelector('.chart-widget canvas[aria-label]',{timeout:6000});
        await env.CHART_IMAGES.put(`private:failed-connect:${sessionId}`,'0',{expirationTtl:120});
        return existing;
      } catch(error) {
        console.warn(JSON.stringify({event:'pulse-browser-session-failed',stage,reason:['chart-session-conflict','hosted-chart-login-required'].includes(error?.message)?error.message:'protocol'}));
        await existing.disconnect();
        // Account conflicts and login challenges must not trigger browser churn.
        if (['chart-session-conflict','hosted-chart-login-required'].includes(error?.message)) throw error;
        // Keep a newly restored page loading; do not replace it every minute.
        if (await env.CHART_IMAGES.get('private:restoring-session')===sessionId) throw new Error('hosted-browser-recovering');
      }
    }
  }
  if (sessionId) await prepareChartReplacement(env,sessionId);
  if (env.CAPTURE_SAVE_LOGIN!=='true') throw new Error('hosted-chart-login-required');
  if (!loginRecoveryExpiry(env)) throw new Error('hosted-chart-login-required');
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
  // Remember ownership before connecting, even if initialization times out.
  await env.CHART_IMAGES.put('private:session',acquired.sessionId);
  await env.CHART_IMAGES.put('private:restoring-session',acquired.sessionId,{expirationTtl:180});
  const browser=await connectChartBrowser(env.BROWSER,acquired.sessionId,Math.max(1,deadline-Date.now()));
  let stage='restore-page';
  try {
    const page=await browser.newPage();
    await page.bringToFront();
    stage='restore-cookies';
    // This is a fresh browser: avoid Page.setCookie's serial delete request per
    // cookie, which can exhaust the lease before the single restore request.
    const client=await page.createCDPSession();
    try {await client.send('Network.setCookies',{cookies});}
    finally {await client.detach();}
    await env.CHART_IMAGES.put('private:session',acquired.sessionId);
    await env.CHART_IMAGES.put('private:restoring-session',acquired.sessionId,{expirationTtl:180});
    stage='restore-navigation';
    await page.goto(CHART_URL,{waitUntil:'domcontentloaded',timeout:12_000});
    stage='restore-reconnect';
    await reconnectChart(env,page);
    stage='restore-chart';
    await page.waitForSelector('.chart-widget canvas[aria-label]',{timeout:12_000});
    await env.CHART_IMAGES.put('private:session',acquired.sessionId);
    return browser;
  } catch(error) { await browser.disconnect(); throw new Error(error?.message==='chart-session-conflict' ? error.message : stage+'-failed'); }
}

export async function rememberChartLogin(env,page) {
  // Off by default. Enable only after the owner explicitly approves keeping this
  // dedicated TradingView login encrypted in their Cloudflare account.
  if (env.CAPTURE_SAVE_LOGIN!=='true') return;
  const expiration=loginRecoveryExpiry(env);
  if (!expiration || expiration*1000-Date.now()<60_000) return;
  const updated=Number(await env.CHART_IMAGES.get('private:login-saved-at')||0);
  if (Date.now()-updated<6*3600_000) return;
  const cookies=(await page.cookies('https://www.tradingview.com/')).filter(c=>/^\.?((www\.)?tradingview\.com)$/.test(c.domain));
  if (!cookies.length) throw new Error('hosted-chart-login-required');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await authKey(env,'encrypt'),encoder.encode(JSON.stringify(cookies)));
  const sealed=new Uint8Array(12+encrypted.byteLength);sealed.set(iv);sealed.set(new Uint8Array(encrypted),12);
  await env.CHART_IMAGES.put('private:login',sealed,{expiration});
  await env.CHART_IMAGES.put('private:login-saved-at',String(Date.now()),{expiration});
}
