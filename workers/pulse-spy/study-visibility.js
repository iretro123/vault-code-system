import {INDICATOR,MULTI_INDICATOR} from './capture-policy.js';

// TradingView's own legend controls. No replacement drawings or chart tabs.
export async function setStudyVisibility(page,name,show) {
  const rect=await page.evaluate(name=>{
    const title=Array.from(document.querySelectorAll('[data-qa-id="title-wrapper legend-source-title"]')).find(e=>e.textContent.trim()===name && e.getBoundingClientRect().width>0);
    const r=title?.getBoundingClientRect();
    return r?{x:r.x+8,y:r.y+r.height/2}:null;
  },name);
  if (!rect) return null;
  await page.mouse.move(rect.x,rect.y);
  const state=await page.evaluate(({name,show})=>{
    const title=Array.from(document.querySelectorAll('[data-qa-id="title-wrapper legend-source-title"]')).find(e=>e.textContent.trim()===name && e.getClientRects().length);
    const button=title?.parentElement?.parentElement?.querySelector('[data-qa-id="legend-show-hide-action"]');
    const label=(button?.getAttribute('aria-label')||button?.getAttribute('title')||'').toLowerCase();
    if (!['show','hide'].includes(label)) return null;
    const visible=label==='hide';
    if (visible!==show) button.focus();
    return {visible,change:visible!==show};
  },{name,show});
  if (!state) return null;
  if (state.change) {
    await page.keyboard.press('Enter');
    await page.waitForFunction(({name,show})=>{
      const title=Array.from(document.querySelectorAll('[data-qa-id="title-wrapper legend-source-title"]')).find(e=>e.textContent.trim()===name && e.getClientRects().length);
      const button=title?.parentElement?.parentElement?.querySelector('[data-qa-id="legend-show-hide-action"]');
      return (button?.getAttribute('aria-label')||button?.getAttribute('title')||'').toLowerCase()===(show?'hide':'show');
    },{timeout:3000},{name,show});
  }
  return state.visible;
}

export async function selectCaptureStudy(page,symbol) {
  let selected=symbol==='NASDAQ:QQQ'?MULTI_INDICATOR:INDICATOR;
  let wasVisible=await setStudyVisibility(page,selected,true);
  if (wasVisible===null && symbol==='AMEX:SPY') {
    selected=MULTI_INDICATOR;
    wasVisible=await setStudyVisibility(page,selected,true);
  }
  if (wasVisible===null) throw new Error('pulse-indicator-missing');
  const other=selected===INDICATOR?MULTI_INDICATOR:INDICATOR;
  const otherWasVisible=await setStudyVisibility(page,other,false);
  await page.mouse.move(0,0);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  return {selected,wasVisible,otherWasVisible};
}
