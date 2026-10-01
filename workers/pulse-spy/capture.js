import { liquidityVisibility } from './liquidity-capture.js';
import { setDataWindow, readChartSource, readZoneBounds, selectChartTimeframe } from './capture-source.js';
import { frameChart } from './capture-framing.js';
import { CHART_URL, INDICATOR, captureWindowOpen, verifyCaptureSource, chartMatches, sourceIndicator, MULTI_INDICATOR } from './capture-policy.js';
import { openChartSession, rememberChartLogin } from './capture-session.js';

// All chart interaction stays in the dedicated hosted session. Never import
// cookies from a personal browser or attach to unrelated Cloudflare sessions.
export async function runCapture(env, rpc, budgetMs=Infinity) {
  if (!captureWindowOpen()) return 'idle';
  const task = await rpc('pulse_spy_capture_claim',{},5000);
  if (!task) return 'idle';
  if (task.busy) return 'busy';
  const deadline=Date.now()+budgetMs;
  const timing = {};
  let stageAt = Date.now();
  const mark = name => { const at=Date.now(); timing[name]=at-stageAt; stageAt=at; if (at>deadline && !result.ok) throw new Error('capture-budget-exceeded'); };
  let browser;
  const evidence={};
  const recordZone=(source,phase)=>{
    if (!task.post) return;
    evidence.expectedLower=task.post.lower;
    evidence.expectedUpper=task.post.upper;
    try {
      const bounds=readZoneBounds(source.zoneText)[task.post.side];
      evidence[phase+'Lower']=bounds.lower;
      evidence[phase+'Upper']=bounds.upper;
    } catch { /* Incomplete data must still fail source validation below. */ }
  };
  let result = { ok:false, failure:'capture-unavailable' };
  try {
    if (!env.BROWSER || !env.CHART_IMAGES) throw new Error('hosted-browser-not-configured');
    // openChartSession can use a persisted session or an authorized encrypted
    // login. An initial CAPTURE_SESSION_ID is not required for recovery.
    browser = await openChartSession(env,Math.min(50_000,budgetMs));
    mark('connectMs');
    const pages = await browser.pages();
    const page = pages.find(p=>p.url().startsWith(CHART_URL));
    if (!page) throw new Error('hosted-chart-login-required');
    page.setDefaultTimeout(6000);
    if(task.post) await liquidityVisibility(page,false);
    // Render text at 2x in a compact landscape chart, then retain the lossless PNG.
    // This avoids shrinking a tall, low-resolution desktop screenshot into a card.
    if (task.post) {
      await page.setViewport({width:1280,height:800,deviceScaleFactor:2});
      await selectChartTimeframe(page,task.post.timeframe,task.post.symbol);
      mark('setupMs');
      await frameChart(page,{reuse:true});
      mark('frameMs');
    }
    // Idle health checks must not reframe or resize the shared live chart.
    if (task.post) await setDataWindow(page,true);
    const readSource=()=>readChartSource(page);
    const source = await readSource();
    if (!['AMEX:SPY','NASDAQ:QQQ'].some(symbol=>[5,15].some(tf=>chartMatches(source.label,symbol,tf))) || !(source.text.includes(INDICATOR)||source.text.includes(MULTI_INDICATOR))
      || /disconnected|connection lost|can't open this chart|verify you are human/i.test(source.pageText)) throw new Error('hosted-chart-login-required');
    if (task.post) {
      recordZone(source,'before');
      verifyCaptureSource(source,task.post);
      mark('verifyBeforeMs');
      // The Data window is only for verification. It must not squeeze the chart
      // into a portrait crop or appear in the member image.
      await setDataWindow(page,false);
      const chart = await page.$('.chart-widget');
      const bounds = await chart?.boundingBox();
      if (!bounds || bounds.width<900 || bounds.height<400 || bounds.width/bounds.height<1.3) throw new Error('chart-crop-unavailable');
      mark('cropMs');
      const capturedAt=Date.now();
      const bytes=await page.screenshot({type:'png',clip:bounds,captureBeyondViewport:false});
      mark('screenshotMs');
      await setDataWindow(page,true);
      // A slow render may have crossed the freshness deadline; reject it as well.
      const after=await readSource();
      recordZone(after,'after');
      verifyCaptureSource(after,task.post);
      mark('verifyAfterMs');
      if (bytes.byteLength<10_000 || bytes.byteLength>8_000_000) throw new Error('chart-image-invalid');
      const imageId=crypto.randomUUID();
      await env.CHART_IMAGES.put(imageId,bytes,{expirationTtl:30*24*3600});
      mark('storeMs');
      result={ok:true,imageId,capturedAt,symbol:task.post.symbol,timeframe:task.post.timeframe,indicator:sourceIndicator(source.text,task.post.symbol)};
    } else result={ok:true};
    // Cookie backup is auxiliary: never discard an already verified/stored image
    // because the recovery store briefly failed. Future health cycles retry it.
    try { await rememberChartLogin(env,page); }
    catch { console.warn('Pulse session backup deferred; capture result preserved.'); }
    mark('recoveryMs');
  } catch (error) {
    // Never put provider errors, URLs, page content or credentials into logs.
    const safe = new Set(['browser-acquire-unavailable','restore-page-failed','restore-cookies-failed','restore-navigation-failed','restore-chart-failed','restore-reconnect-failed','hosted-browser-timeout','hosted-browser-recovering','capture-budget-exceeded','chart-session-conflict','hosted-browser-not-configured','hosted-chart-login-required','timeframe-control-unavailable','wrong-instrument','capture-window-expired','wrong-chart-timeframe','pulse-indicator-missing','chart-needs-attention','chart-price-mismatch','chart-zone-data-unavailable','chart-zone-mismatch','chart-crop-unavailable','chart-image-invalid']);
    result={ok:false,failure:safe.has(error?.message)?error.message:'hosted-browser-unavailable'};
  } finally { if (browser) { try { await browser.disconnect(); } catch { /* Still record the result if the session disconnected itself. */ } } }
  timing.cleanupMs=Date.now()-stageAt;
  result.timing=timing;
  result.evidence=evidence;
  console.info(JSON.stringify({event:'pulse-capture-result',ok:result.ok,failure:result.failure||null,timing,hasPost:!!task.post}));
  const finished=await rpc('pulse_spy_capture_finish',{p_lease:task.lease,p_event_id:task.post?.id??null,p_result:result},5000);
  if (!finished) throw new Error('capture-lease-lost');
  return !result.ok ? 'retry' : task.post ? 'more' : 'idle';
}

export async function drainCaptures(env,rpc) {
  let retryPending=false;
  for (let i=0;i<8;i++) {
    const result=await runCapture(env,rpc);
    // A retry's backoff must not block another fresh event. Keep a durable wake
    // even when the next claim has no work eligible yet.
    if (result==='busy') return false;
    if (result==='retry') retryPending=true;
    if (result==='idle') return !retryPending;
  }
  // A bounded consumer hands any remaining work back to the durable queue.
  return false;
}
