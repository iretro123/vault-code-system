import {CHART_URL, chartMatches} from './capture-policy.js';
import {selectCaptureStudy} from './study-visibility.js';
// Batch DOM-only actions into one browser round trip per phase. Do not wait for
// network idle: a live chart intentionally keeps network connections open.
export async function setDataWindow(page,open) {
  const found=await page.evaluate(open=>{
    const toggle=document.querySelector('button[aria-label="Object tree and data window"]');
    if (!toggle) return false;
    if ((toggle.getAttribute('aria-pressed')==='true')!==open) toggle.click();
    return true;
  },open);
  if (!found) throw new Error('chart-zone-data-unavailable');
  if (open) {
    await page.mouse.move(1270,790);
    await page.waitForFunction(()=>{
      const tab=document.querySelector('#data-window');
      if (!tab) return false;
      if (tab.getAttribute('aria-selected')!=='true') { tab.click(); return false; }
      return Array.from(document.querySelectorAll('[role="row"]')).some(el=>{
        const text=el.innerText;
        return text.includes('Vault Zone Pulse - SPY & QQQ') && !text.includes('Vault Zone Pulse - SPY Live') &&
          ['Demand lower','Demand upper','Supply lower','Supply upper'].every(field=>text.includes(field));
      });
    },{timeout:6000});
  } else {
    await page.waitForFunction(()=>document.querySelector('button[aria-label="Object tree and data window"]')?.getAttribute('aria-pressed')!=='true',{timeout:3000});
  }
}

export async function selectChartTimeframe(page,timeframe,symbol='AMEX:SPY') {
  if (!['AMEX:SPY','NASDAQ:QQQ'].includes(symbol) || ![5,15].includes(timeframe)) throw new Error('wrong-instrument');
  const label=await page.evaluate(()=>document.querySelector('.chart-widget canvas[aria-label]')?.getAttribute('aria-label')||'');
  if (!label.includes(`:${symbol.split(':')[1]},`)) {
    // Navigate the SAME hosted page, under the shared database lease. Never create a chart tab.
    await navigateCaptureChart(page,`${CHART_URL}?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}`);
    await page.waitForSelector('.chart-widget canvas[aria-label]',{timeout:6000});
  }
  const selected=await page.evaluate(tf=>{
    const button=Array.from(document.querySelectorAll(`[role="radio"][aria-label="${tf} minutes"]`)).find(el=>el.getClientRects().length);
    if (!button) return false;
    if (button.getAttribute('aria-checked')!=='true') button.click();
    return true;
  },timeframe);
  if (!selected) throw new Error('timeframe-control-unavailable');
  await page.mouse.move(1270,790);
  await page.waitForFunction(({tf,ticker})=>{
    const widget=document.querySelector('.chart-widget');
    return widget?.querySelector('canvas[aria-label]')?.getAttribute('aria-label')?.endsWith(`${ticker}, ${tf} minutes`) && widget.innerText.match(/Vault Zone Pulse - (?:SPY Live|SPY & QQQ)/);
  },{timeout:6000},{tf:timeframe,ticker:symbol.split(':')[1]});
  const verified=await page.evaluate(()=>document.querySelector('.chart-widget canvas[aria-label]')?.getAttribute('aria-label')||'');
  if (!chartMatches(verified,symbol,timeframe)) throw new Error('wrong-instrument');
  return selectCaptureStudy(page,symbol);
}

export async function navigateCaptureChart(page,url) {
  // The dedicated capture layout changes timeframe between jobs. TradingView
  // can ask to leave that view on navigation. Puppeteer does not auto-handle
  // dialogs: an unanswered beforeunload blocks navigation and future commands.
  // Only this ordinary leave-page confirmation may be accepted, never a login,
  // security challenge, prompt, or other confirmation.
  const pending=[];
  let unexpected=false;
  const handle=dialog=>{
    const leaving=dialog.type()==='beforeunload';
    console.info(leaving ? 'pulse-chart-leave-confirmation' : 'pulse-chart-unexpected-dialog');
    unexpected ||= !leaving;
    pending.push((leaving ? dialog.accept() : dialog.dismiss()).catch(()=>{unexpected=true;}));
  };
  page.on('dialog',handle);
  try {
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:12000});
    await Promise.all(pending);
    if(unexpected) throw new Error('chart-needs-attention');
  } finally { page.off('dialog',handle); }
}

export async function readChartSource(page) {
  return page.evaluate(()=>{
    const label=document.querySelector('.chart-widget canvas[aria-label]')?.getAttribute('aria-label')||'';
    const rows=Array.from(document.querySelectorAll('[role="row"]'));
    const sharedName='Vault Zone Pulse - SPY & QQQ',legacyName='Vault Zone Pulse - SPY Live';
    // Data Window can expose enclosing rows as well as study rows. Never read
    // the first bounds from an enclosing row containing both studies.
    const study=(name,other)=>rows.filter(el=>el.innerText.includes(name) && !el.innerText.includes(other) && el.innerText.includes('Demand lower'))
      .sort((a,b)=>a.innerText.length-b.innerText.length)[0];
    const shared=study(sharedName,legacyName);
    const legacy=study(legacyName,sharedName);
    // Never silently fall back to the legacy lifecycle. Both instruments use
    // the shared study selected by selectCaptureStudy before this read.
    const selected=shared;
    return {
    label,
    text:document.querySelector('.chart-widget')?.innerText||'',pageText:document.body.innerText,
    zoneText:selected?.innerText||'',
    studyTexts:{legacy:legacy?.innerText||'',shared:shared?.innerText||''},
    enclosingStudyRows:rows.filter(el=>el.innerText.includes(sharedName) && el.innerText.includes(legacyName)).length,
  };});
}
export function readZoneBounds(text) {
  const result={};
  for(const side of ['Demand','Supply']) {
    const bounds={};
    for(const bound of ['lower','upper']) {
      const match=text.match(new RegExp(`${side} ${bound}\\s*(∅|[\\d,]+(?:\\.\\d+)?)`));
      if(!match) throw new Error('chart-zone-data-unavailable');
      bounds[bound]=match[1]==='∅'?null:Number(match[1].replaceAll(',',''));
    }
    if((bounds.lower===null)!==(bounds.upper===null) || (bounds.lower!==null && bounds.lower>=bounds.upper)) throw new Error('chart-zone-mismatch');
    result[side.toLowerCase()]=bounds;
  }
  return result;
}
