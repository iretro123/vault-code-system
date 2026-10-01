import { setDataWindow, readChartSource, readZoneBounds, selectChartTimeframe } from './capture-source.js';
import { frameChart } from './capture-framing.js';
import { CHART_URL, chartMatches, sourceIndicator } from './capture-policy.js';
import { openChartSession, rememberChartLogin } from './capture-session.js';

// Explicit operator preflight: never claims an event, changes capture_enabled,
// creates member notifications, or substitutes a current image for an old alert.
export async function checkChartConnection(env, timeframe, symbol = 'AMEX:SPY') {
  if (!['AMEX:SPY','NASDAQ:QQQ'].includes(symbol)) return {ok:false,failure:'wrong-instrument'};
  if (timeframe !== undefined && ![5,15].includes(timeframe)) return {ok:false,failure:'wrong-chart-timeframe'};
  let browser;
  let stage='session';
  let indicatorVisibility;
  const timing={};
  let stageAt=Date.now();
  const next=name=>{const at=Date.now();timing[stage+'Ms']=at-stageAt;stageAt=at;stage=name;};
  try {
    if (!env.BROWSER || !env.CHART_IMAGES) return { ok:false, failure:'hosted-browser-not-configured' };
    browser = await openChartSession(env);
    const page = (await browser.pages()).find(p => p.url().startsWith(CHART_URL));
    if (!page) return { ok:false, failure:'hosted-chart-login-required' };
    next('viewport');
    await page.setViewport({width:1280,height:800,deviceScaleFactor:2});
    next('timeframe');
    if (timeframe || symbol !== 'AMEX:SPY') indicatorVisibility=await selectChartTimeframe(page,timeframe || 5,symbol);
    next('framing');
    await frameChart(page,{reuse:true});
    next('source');
    const source = await page.evaluate(() => ({
      label:document.querySelector('.chart-widget canvas[aria-label]')?.getAttribute('aria-label') || '',
      text:document.querySelector('.chart-widget')?.innerText || '',
      pageText:document.body.innerText,
    }));
    const chartTimeframe = [5,15].find(value=>chartMatches(source.label,symbol,value));
    if (/disconnected|connection lost|reconnect|cannot connect/i.test(source.pageText)) return {ok:false,failure:'chart-session-conflict'};
    if (/can't open this chart|sign in to continue|verify you are human/i.test(source.pageText)) return {ok:false,failure:'hosted-chart-login-required'};
    if (!chartTimeframe) return {ok:false,failure:'wrong-chart-timeframe'};
    if (!sourceIndicator(source.text,symbol)) return {ok:false,failure:'pulse-indicator-missing'};
    next('zones');
    await setDataWindow(page,true);
    const chartSource=await readChartSource(page);

    // Bounded diagnostics identify cross-study disagreement without exporting
    // page text, browser credentials, or unrelated account data.
    const studyZones={};
    for (const [name,text] of Object.entries(chartSource.studyTexts||{})) {
      try { studyZones[name]=readZoneBounds(text); } catch { studyZones[name]=null; }
    }
    let zones;
    try { zones=readZoneBounds(chartSource.zoneText); }
    catch {
      await setDataWindow(page,false);
      return {ok:false,failure:'chart-zone-data-unavailable',symbol,timeframe:chartTimeframe,studyZones,indicatorVisibility,enclosingStudyRows:chartSource.enclosingStudyRows||0};
    }
    await setDataWindow(page,false);
    next('image');
    const chart=await page.$('.chart-widget');
    const bounds=await chart?.boundingBox();
    if (!bounds || bounds.width<900 || bounds.height<400 || bounds.width/bounds.height<1.3) return {ok:false,failure:'chart-crop-unavailable'};
    const bytes=await page.screenshot({type:'png',clip:bounds,captureBeyondViewport:false});
    if (bytes.byteLength<10_000 || bytes.byteLength>8_000_000) return {ok:false,failure:'chart-image-invalid'};
    const imageId=crypto.randomUUID();
    const capturedAt=Date.now();
    // Short-lived operator QA image, never attached to a member event.
    await env.CHART_IMAGES.put(imageId,bytes,{expirationTtl:3600,metadata:{contentType:'image/png',purpose:'operator-preflight'}});
    next('recovery');
    try { await rememberChartLogin(env,page); } catch { /* Optional backup cannot invalidate a verified image. */ }
    next('done');
    return { ok:true, timing, symbol, timeframe:chartTimeframe, indicator:sourceIndicator(source.text,symbol), zones, studyZones, indicatorVisibility, enclosingStudyRows:chartSource.enclosingStudyRows||0, imageId, capturedAt };
  } catch(error) {
    if (['chart-session-conflict','chart-zone-data-unavailable','chart-zone-mismatch','hosted-browser-timeout','hosted-browser-recovering','browser-acquire-unavailable','wrong-instrument','timeframe-control-unavailable'].includes(error?.message)) return {ok:false,failure:error.message};
    // No provider error text, cookies, URLs or page contents cross this boundary.
    return { ok:false, failure:stage==='session' ? 'hosted-chart-login-required' : `chart-check-${stage}-failed` };
  } finally {
    if (browser) { try { await browser.disconnect(); } catch { /* read-only preflight complete */ } }
  }
}

export async function captureAuthorized(request, secret) {
  if (!secret) return false;
  const encoder = new TextEncoder();
  const actual = encoder.encode(request.headers.get('Authorization') || '');
  const expected = encoder.encode(`Bearer ${secret}`);
  return actual.byteLength === expected.byteLength && crypto.subtle.timingSafeEqual(actual, expected);
}
