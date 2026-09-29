export async function setDataWindow(page,open) {
  const toggle=await page.$('button[aria-label="Object tree and data window"]');
  if (!toggle) throw new Error('chart-zone-data-unavailable');
  if (((await toggle.evaluate(el=>el.getAttribute('aria-pressed')))==='true') !== open) await toggle.evaluate(el=>el.click());
  if (open) {
    await page.waitForFunction(()=>document.querySelector('#data-window'),{timeout:6000});
    const tab=await page.$('#data-window');
    if (!tab) throw new Error('chart-zone-data-unavailable');
    if (await tab.evaluate(el=>el.getAttribute('aria-selected'))!=='true') await tab.evaluate(el=>el.click());
    await page.mouse.move(1270,790);
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role="row"]')).some(el=>el.innerText.includes('Vault Zone Pulse - SPY Live') && el.innerText.includes('Demand lower')),{timeout:6000});
  } else {
    await page.waitForFunction(()=>document.querySelector('button[aria-label="Object tree and data window"]')?.getAttribute('aria-pressed')!=='true',{timeout:3000});
  }
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
