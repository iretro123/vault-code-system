import { CHART_URL, INDICATOR, captureWindowOpen, verifyCaptureSource } from './capture-policy.js';
import { openChartSession, rememberChartLogin } from './capture-session.js';

// All chart interaction stays in the dedicated hosted session. Never import
// cookies from a personal browser or attach to unrelated Cloudflare sessions.
export async function runCapture(env, rpc) {
  if (!captureWindowOpen()) return 'idle';
  const task = await rpc('pulse_spy_capture_claim',{},5000);
  if (!task) return 'idle';
  let browser;
  let result = { ok:false, failure:'capture-unavailable' };
  try {
    if (!env.BROWSER || !env.CHART_IMAGES) throw new Error('hosted-browser-not-configured');
    // openChartSession can use a persisted session or an authorized encrypted
    // login. An initial CAPTURE_SESSION_ID is not required for recovery.
    browser = await openChartSession(env);
    const pages = await browser.pages();
    const page = pages.find(p=>p.url().startsWith(CHART_URL));
    if (!page) throw new Error('hosted-chart-login-required');
    page.setDefaultTimeout(6000);
    // Render text at 2x in a compact landscape chart, then retain the lossless PNG.
    // This avoids shrinking a tall, low-resolution desktop screenshot into a card.
    await page.setViewport({width:1280,height:800,deviceScaleFactor:2});
    if (task.post) {
      const buttons = await page.$$(`[role="radio"][aria-label="${task.post.timeframe} minutes"]`);
      let selected = false;
      for (const button of buttons) {
        if (await button.boundingBox()) { await button.click(); selected=true; break; }
      }
      if (!selected) throw new Error('timeframe-control-unavailable');
      await page.mouse.move(1270,790);
      await page.waitForFunction((tf) => {
        const canvas=document.querySelector('.chart-widget canvas[aria-label]');
        const widget=document.querySelector('.chart-widget');
        return canvas?.getAttribute('aria-label')?.endsWith(`SPY, ${tf} minutes`) && widget?.innerText.includes('Vault Zone Pulse - SPY Live');
      },{timeout:6000},task.post.timeframe);
    }
    if (task.post) {
      const toggle=await page.$('button[aria-label="Object tree and data window"]');
      if (!toggle) throw new Error('chart-zone-data-unavailable');
      if (await toggle.evaluate(e=>e.getAttribute('aria-pressed'))!=='true') await toggle.click();
      const dataTab=await page.$('#data-window');
      if (!dataTab) throw new Error('chart-zone-data-unavailable');
      if (await dataTab.evaluate(e=>e.getAttribute('aria-selected'))!=='true') await dataTab.click();
      await page.mouse.move(1270,10);
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role="row"]')).some(e=>e.innerText.includes('Vault Zone Pulse - SPY Live') && e.innerText.includes('Demand lower')),{timeout:6000});
    }
    const readSource=()=>page.evaluate(()=>({
      label:document.querySelector('.chart-widget canvas[aria-label]')?.getAttribute('aria-label')||'',
      text:document.querySelector('.chart-widget')?.innerText||'',pageText:document.body.innerText,
      zoneText:Array.from(document.querySelectorAll('[role="row"]')).find(e=>e.innerText.includes('Vault Zone Pulse - SPY Live'))?.innerText||'',
    }));
    const source = await readSource();
    if (!source.label.match(/^Chart for (AMEX|BATS):SPY, (5|15) minutes$/) || !source.text.includes(INDICATOR)
      || /disconnected|connection lost|can't open this chart|verify you are human/i.test(source.pageText)) throw new Error('hosted-chart-login-required');
    if (task.post) {
      verifyCaptureSource(source,task.post);
      // The Data window is only for verification. It must not squeeze the chart
      // into a portrait crop or appear in the member image.
      const dataToggle=await page.$('button[aria-label="Object tree and data window"]');
      if (!dataToggle) throw new Error('chart-zone-data-unavailable');
      await dataToggle.click();
      await page.waitForFunction(()=>document.querySelector('button[aria-label="Object tree and data window"]')?.getAttribute('aria-pressed')!=='true',{timeout:3000});
      const chart = await page.$('.chart-widget');
      const bounds = await chart?.boundingBox();
      if (!bounds || bounds.width<900 || bounds.height<400 || bounds.width/bounds.height<1.3) throw new Error('chart-crop-unavailable');
      const capturedAt=Date.now();
      const bytes=await chart.screenshot({type:'png'});
      await dataToggle.click();
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role="row"]')).some(e=>e.innerText.includes('Vault Zone Pulse - SPY Live') && e.innerText.includes('Demand lower')),{timeout:3000});
      // A slow render may have crossed the freshness deadline; reject it as well.
      verifyCaptureSource(await readSource(),task.post);
      if (bytes.byteLength<10_000 || bytes.byteLength>8_000_000) throw new Error('chart-image-invalid');
      const imageId=crypto.randomUUID();
      await env.CHART_IMAGES.put(imageId,bytes,{expirationTtl:30*24*3600});
      result={ok:true,imageId,capturedAt,symbol:'AMEX:SPY',timeframe:task.post.timeframe,indicator:INDICATOR};
    } else result={ok:true};
    await rememberChartLogin(env,page);
  } catch (error) {
    // Never put provider errors, URLs, page content or credentials into logs.
    const safe = new Set(['hosted-browser-not-configured','hosted-chart-login-required','timeframe-control-unavailable','wrong-instrument','capture-window-expired','wrong-chart-timeframe','pulse-indicator-missing','chart-needs-attention','chart-price-mismatch','chart-zone-data-unavailable','chart-zone-mismatch','chart-crop-unavailable','chart-image-invalid']);
    result={ok:false,failure:safe.has(error?.message)?error.message:'hosted-browser-unavailable'};
  } finally { if (browser) { try { await browser.disconnect(); } catch { /* Still record the result if the session disconnected itself. */ } } }
  const finished=await rpc('pulse_spy_capture_finish',{p_lease:task.lease,p_event_id:task.post?.id??null,p_result:result},5000);
  if (!finished) throw new Error('capture-lease-lost');
  return !result.ok ? 'retry' : task.post ? 'more' : 'idle';
}

export async function drainCaptures(env,rpc) {
  for (let i=0;i<8;i++) {
    const result=await runCapture(env,rpc);
    if (result==='retry') return false;
    if (result==='idle') return true;
  }
  // A bounded consumer hands any remaining work back to the durable queue.
  return false;
}
