import { CHART_URL, INDICATOR, captureWindowOpen, verifyCaptureSource } from './capture-policy.js';
import { openChartSession, rememberChartLogin } from './capture-session.js';

// All chart interaction stays in the dedicated hosted session. Never import
// cookies from a personal browser or attach to unrelated Cloudflare sessions.
export async function runCapture(env, rpc) {
  if (!env.BROWSER || !env.CHART_IMAGES || !env.CAPTURE_SESSION_ID || !captureWindowOpen()) return;
  const task = await rpc('pulse_spy_capture_claim',{},5000);
  if (!task) return;
  let browser;
  let result = { ok:false, failure:'capture-unavailable' };
  try {
    browser = await openChartSession(env);
    const pages = await browser.pages();
    const page = pages.find(p=>p.url().startsWith(CHART_URL));
    if (!page) throw new Error('hosted-chart-login-required');
    page.setDefaultTimeout(6000);
    // Set a consistent landscape crop; keep the actual candles and indicator untouched.
    await page.setViewport({width:1440,height:960,deviceScaleFactor:1.5});
    if (task.post) {
      const buttons = await page.$$(`[role="radio"][aria-label="${task.post.timeframe} minutes"]`);
      let selected = false;
      for (const button of buttons) {
        if (await button.boundingBox()) { await button.click(); selected=true; break; }
      }
      if (!selected) throw new Error('timeframe-control-unavailable');
      await page.mouse.move(1430,950);
      await page.waitForFunction((tf) => {
        const canvas=document.querySelector('.chart-widget canvas[aria-label]');
        const widget=document.querySelector('.chart-widget');
        return canvas?.getAttribute('aria-label')?.endsWith(`SPY, ${tf} minutes`) && widget?.innerText.includes('Vault Zone Pulse - SPY Live');
      },{timeout:6000},task.post.timeframe);
    }
    const source = await page.evaluate(()=>({
      label:document.querySelector('.chart-widget canvas[aria-label]')?.getAttribute('aria-label')||'',
      text:document.querySelector('.chart-widget')?.innerText||'',pageText:document.body.innerText,
    }));
    if (!source.label.match(/^Chart for (AMEX|BATS):SPY, (5|15) minutes$/) || !source.text.includes(INDICATOR)
      || /disconnected|connection lost|can't open this chart|verify you are human/i.test(source.pageText)) throw new Error('hosted-chart-login-required');
    if (task.post) {
      verifyCaptureSource(source,task.post);
      const chart = await page.$('.chart-widget');
      const bounds = await chart?.boundingBox();
      if (!bounds || bounds.width<700 || bounds.height<400) throw new Error('chart-crop-unavailable');
      const capturedAt=Date.now();
      const bytes=await chart.screenshot({type:'png'});
      // A slow render may have crossed the freshness deadline; reject it as well.
      verifyCaptureSource(source,task.post);
      if (bytes.byteLength<10_000 || bytes.byteLength>8_000_000) throw new Error('chart-image-invalid');
      const imageId=crypto.randomUUID();
      await env.CHART_IMAGES.put(imageId,bytes,{expirationTtl:30*24*3600});
      result={ok:true,imageId,capturedAt,symbol:'AMEX:SPY',timeframe:task.post.timeframe,indicator:INDICATOR};
    } else result={ok:true};
    await rememberChartLogin(env,page);
  } catch (error) {
    // Never put provider errors, URLs, page content or credentials into logs.
    const safe = new Set(['hosted-chart-login-required','timeframe-control-unavailable','wrong-instrument','capture-window-expired','wrong-chart-timeframe','pulse-indicator-missing','chart-needs-attention','chart-price-mismatch','chart-crop-unavailable','chart-image-invalid']);
    result={ok:false,failure:safe.has(error?.message)?error.message:'hosted-browser-unavailable'};
  } finally { if (browser) await browser.disconnect(); }
  await rpc('pulse_spy_capture_finish',{p_lease:task.lease,p_event_id:task.post?.id??null,p_result:result},5000);
}
