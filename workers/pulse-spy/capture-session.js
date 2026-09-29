import puppeteer from '@cloudflare/puppeteer';
import { CHART_URL } from './capture-policy.js';

const encoder=new TextEncoder();
const hexBytes=value=>Uint8Array.from(value.match(/../g),part=>parseInt(part,16));
async function authKey(env, usage) {
  if (!/^[a-f0-9]{64}$/.test(env.CAPTURE_AUTH_KEY||'')) throw new Error('hosted-chart-login-required');
  return crypto.subtle.importKey('raw',hexBytes(env.CAPTURE_AUTH_KEY),'AES-GCM',false,[usage]);
}

export async function openChartSession(env) {
  const sessionId=await env.CHART_IMAGES.get('private:session') || env.CAPTURE_SESSION_ID;
  if (sessionId) {
    try { return await puppeteer.connect(env.BROWSER,sessionId); } catch { /* Expired sessions require a saved, explicitly authorized login. */ }
  }
  if (env.CAPTURE_SAVE_LOGIN!=='true') throw new Error('hosted-chart-login-required');
  const sealed=await env.CHART_IMAGES.get('private:login','arrayBuffer');
  if (!sealed) throw new Error('hosted-chart-login-required');
  const bytes=new Uint8Array(sealed);
  const json=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},await authKey(env,'decrypt'),bytes.slice(12));
  const cookies=JSON.parse(new TextDecoder().decode(json));
  if (!Array.isArray(cookies) || !cookies.length || cookies.some(c=>!/^\.?((www\.)?tradingview\.com)$/.test(c.domain))) throw new Error('hosted-chart-login-required');
  const browser=await puppeteer.launch(env.BROWSER,{keep_alive:600_000});
  try {
    const page=await browser.newPage();
    await page.setCookie(...cookies);
    await page.goto(CHART_URL,{waitUntil:'domcontentloaded',timeout:12_000});
    await env.CHART_IMAGES.put('private:session',browser.sessionId());
    return browser;
  } catch(error) { await browser.close(); throw error; }
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
