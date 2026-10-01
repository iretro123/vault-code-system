import {afterEach,describe,expect,it,vi} from 'vitest';
import {selectCaptureStudy} from '../../workers/pulse-spy/study-visibility.js';
import {INDICATOR,MULTI_INDICATOR} from '../../workers/pulse-spy/capture-policy.js';
function setup(){
 document.body.innerHTML=[INDICATOR,MULTI_INDICATOR].map((name,i)=>`<div><span><span data-qa-id="title-wrapper legend-source-title">${name}</span></span><button data-qa-id="legend-show-hide-action" aria-label="${i?'hide':'show'}"></button></div>`).join('');
 for(const el of document.querySelectorAll('span')) {
  el.getBoundingClientRect=()=>({x:10,y:10,width:40,height:20}) as DOMRect;
  el.getClientRects=()=>[{}] as unknown as DOMRectList;
 }
 const keyboard={press:vi.fn(async()=>{
  const el=document.activeElement!;el.setAttribute('aria-label',el.getAttribute('aria-label')==='show'?'hide':'show');
 })};
 return {evaluate:vi.fn(async(fn,arg)=>fn(arg)),mouse:{move:vi.fn()},keyboard,waitForFunction:vi.fn(async(fn,_opts,arg)=>{if(!fn(arg)) throw new Error('visibility failed');})};
}
afterEach(()=>{document.body.innerHTML='';});
describe('capture indicator isolation',()=>{
 it('shows the shared study and hides legacy for either symbol without switching lifecycles',async()=>{
  const page=setup();
  const buttons=document.querySelectorAll('button');
  buttons[0].setAttribute('aria-label','hide');buttons[1].setAttribute('aria-label','show');
  const state=await selectCaptureStudy(page,'AMEX:SPY');
  expect(state).toEqual({selected:MULTI_INDICATOR,wasVisible:false,otherWasVisible:true});
  expect(page.keyboard.press).toHaveBeenCalledTimes(2);
  expect([...buttons].map(b=>b.getAttribute('aria-label'))).toEqual(['show','hide']);
  await selectCaptureStudy(page,'NASDAQ:QQQ');expect(page.keyboard.press).toHaveBeenCalledTimes(2);
 });
 it('does not fall back to stale legacy SPY when shared is missing',async()=>{
  const page=setup();document.body.lastElementChild!.remove();
  await expect(selectCaptureStudy(page,'AMEX:SPY')).rejects.toThrow('pulse-indicator-missing');
 });
 it('fails safely when the required shared study is absent',async()=>{
  const page=setup();document.body.lastElementChild!.remove();
  await expect(selectCaptureStudy(page,'NASDAQ:QQQ')).rejects.toThrow('pulse-indicator-missing');
 });
});
