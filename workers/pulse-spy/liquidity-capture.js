import { openChartSession } from './capture-session.js';
import { setDataWindow, selectChartTimeframe, readChartSource } from './capture-source.js';
import { frameChart } from './capture-framing.js';
import { CHART_URL, chartMatches, sourceIndicator } from './capture-policy.js';

export const LIQUIDITY_INDICATOR = 'Vault Pulse - Liquidity';
export function readLiquidityLevels(text) {
  const levels = {};
  for (const side of ['above','below']) {
    const match=text.match(new RegExp(`Liquidity reference ${side}\\s*(∅|[\\d,]+(?:\\.\\d+)?)`));
    if (!match) throw new Error('liquidity-values-unavailable');
    levels[side]=match[1]==='∅'?null:Number(match[1].replaceAll(',',''));
    if (levels[side]!==null && (!Number.isFinite(levels[side]) || levels[side]<=0)) throw new Error('liquidity-values-invalid');
  }
  return levels;
}
export function verifyLiquiditySource(source,task,now=Date.now()) {
  if (![5,15].includes(task.timeframe) || !chartMatches(source.label,task.symbol || 'AMEX:SPY',task.timeframe)) throw new Error('liquidity-wrong-timeframe');
  if (!Number.isFinite(task.quoteAt) || now<task.quoteAt || now-task.quoteAt>90000) throw new Error('liquidity-stale-quote');
  if (!sourceIndicator(source.text,task.symbol || 'AMEX:SPY') || !source.text.includes(LIQUIDITY_INDICATOR)) throw new Error('liquidity-indicator-unavailable');
  if (/disconnected|connection lost|reconnect|cannot connect|sign in to continue|verify you are human/i.test(source.pageText)) throw new Error('liquidity-session-unavailable');
  const price=Number(source.text.match(/([\d,]+(?:\.\d+)?)\s*SELL/)?.[1]?.replaceAll(',',''));
  if (!price || !Number.isFinite(task.price) || Math.abs(price-task.price)>Math.max(1,task.price*.002)) throw new Error('liquidity-price-mismatch');
}
// Show only the installed companion; do not add studies or open charts.
export async function liquidityVisibility(page,show) {
  const rect=await page.evaluate(name=>{const title=Array.from(document.querySelectorAll('[data-qa-id="title-wrapper legend-source-title"]')).find(e=>e.textContent.trim()===name && e.getBoundingClientRect().width>0);const r=title?.getBoundingClientRect();return r?{x:r.x+8,y:r.y+r.height/2}:null;},LIQUIDITY_INDICATOR);
  if(!rect)return null;
  await page.mouse.move(rect.x,rect.y);
  const state=await page.evaluate(({name,show})=>{
    const title=Array.from(document.querySelectorAll('[data-qa-id="title-wrapper legend-source-title"]')).find(e=>e.textContent.trim()===name && e.getClientRects().length);
    const button=title?.parentElement?.parentElement?.querySelector('[data-qa-id="legend-show-hide-action"]');
    if(!button) return null;
    const label=(button.getAttribute('aria-label')||button.getAttribute('title')||'').toLowerCase();
    if(!['show','hide'].includes(label)) return null;
    const visible=label==='hide';
    if(visible!==show) button.focus();
    return {visible,change:visible!==show};
  },{name:LIQUIDITY_INDICATOR,show});
  if(!state)return null;
  if(state.change) {
    await page.keyboard.press('Enter');
    await page.waitForFunction(({name,show})=>{
      const title=Array.from(document.querySelectorAll('[data-qa-id="title-wrapper legend-source-title"]')).find(e=>e.textContent.trim()===name && e.getClientRects().length);
      const button=title?.parentElement?.parentElement?.querySelector('[data-qa-id="legend-show-hide-action"]');
      return (button?.getAttribute('aria-label')||button?.getAttribute('title')||'').toLowerCase()===(show?'hide':'show');
    },{timeout:3000},{name:LIQUIDITY_INDICATOR,show});
  }
  return state.visible;
}
export async function captureLiquidity(env,task) {
  let browser,page,wasVisible,stage='session';
  try {
    browser=await openChartSession(env,50000);
    page=(await browser.pages()).find(p=>p.url().startsWith(CHART_URL));
    if (!page) throw new Error('liquidity-session-unavailable');
    stage='viewport';
    await page.setViewport({width:1280,height:800,deviceScaleFactor:2});
    stage='timeframe';
    await selectChartTimeframe(page,task.timeframe,task.symbol);
    stage='visibility';
    wasVisible=await liquidityVisibility(page,true);
    if (wasVisible===null) throw new Error('liquidity-indicator-unavailable');
    stage='framing';
    await frameChart(page,{reuse:true});
    await setDataWindow(page,true);
    const read=async()=>{
      const source=await readChartSource(page);
      verifyLiquiditySource(source,task);
      const text=await page.evaluate(name=>Array.from(document.querySelectorAll('[role="row"]')).find(e=>e.innerText.includes(name))?.innerText||'',LIQUIDITY_INDICATOR);
      return readLiquidityLevels(text);
    };
    stage='source';
    const levels=await read();
    await setDataWindow(page,false);
    const bounds=await (await page.$('.chart-widget'))?.boundingBox();
    if (!bounds || bounds.width<900 || bounds.height<400) throw new Error('liquidity-crop-unavailable');
    stage='image';
    const capturedAt=Date.now();
    const bytes=await page.screenshot({type:'png',clip:bounds,captureBeyondViewport:false});
    await setDataWindow(page,true);
    const after=await read();
    if (JSON.stringify(levels)!==JSON.stringify(after)) throw new Error('liquidity-levels-changed');
    await setDataWindow(page,false);
    if (bytes.byteLength<10000 || bytes.byteLength>8000000) throw new Error('liquidity-image-invalid');
    const imageId=crypto.randomUUID();
    await env.CHART_IMAGES.put(imageId,bytes,{metadata:{contentType:'image/png',purpose:'liquidity-snapshot'}});
    return {ok:true,imageId,capturedAt,symbol:task.symbol,quoteAt:task.quoteAt,timeframe:task.timeframe,...levels};
  } catch(error) {
    return {ok:false,failure:/^liquidity-[a-z-]+$/.test(error?.message||'')?error.message:`liquidity-${stage}-failed`};
  } finally {
    if (page) { try { await liquidityVisibility(page,false); await setDataWindow(page,false); } catch { /* Next zone capture validates its own source. */ } }
    if (browser) { try { await browser.disconnect(); } catch { /* Lease still bounds recovery. */ } }
  }
}
export async function runLiquidityCapture(env,rpc,timeframe=null,force=false,symbol=null) {
  const task=await rpc('pulse_market_liquidity_claim',{p_timeframe:timeframe,p_force:force,p_symbol:symbol});
  if (!task || task.busy) return {ok:false,failure:task?.busy?'capture-busy':'liquidity-not-due'};
  const result=await captureLiquidity(env,task);
  const saved=await rpc('pulse_market_liquidity_finish',{p_symbol:task.symbol,p_lease:task.lease,p_timeframe:task.timeframe,p_result:result});
  return saved?result:{ok:false,failure:'liquidity-lease-lost'};
}
