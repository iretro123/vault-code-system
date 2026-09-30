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
      return Array.from(document.querySelectorAll('[role="row"]')).some(el=>el.innerText.includes('Vault Zone Pulse - SPY Live') && el.innerText.includes('Demand lower'));
    },{timeout:6000});
  } else {
    await page.waitForFunction(()=>document.querySelector('button[aria-label="Object tree and data window"]')?.getAttribute('aria-pressed')!=='true',{timeout:3000});
  }
}

export async function selectChartTimeframe(page,timeframe) {
  const selected=await page.evaluate(tf=>{
    const button=Array.from(document.querySelectorAll(`[role="radio"][aria-label="${tf} minutes"]`)).find(el=>el.getClientRects().length);
    if (!button) return false;
    if (button.getAttribute('aria-checked')!=='true') button.click();
    return true;
  },timeframe);
  if (!selected) throw new Error('timeframe-control-unavailable');
  await page.mouse.move(1270,790);
  await page.waitForFunction(tf=>{
    const widget=document.querySelector('.chart-widget');
    return widget?.querySelector('canvas[aria-label]')?.getAttribute('aria-label')?.endsWith(`SPY, ${tf} minutes`) && widget.innerText.includes('Vault Zone Pulse - SPY Live');
  },{timeout:6000},timeframe);
}

export async function readChartSource(page) {
  return page.evaluate(()=>({
    label:document.querySelector('.chart-widget canvas[aria-label]')?.getAttribute('aria-label')||'',
    text:document.querySelector('.chart-widget')?.innerText||'',pageText:document.body.innerText,
    zoneText:Array.from(document.querySelectorAll('[role="row"]')).find(el=>el.innerText.includes('Vault Zone Pulse - SPY Live'))?.innerText||'',
  }));
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
