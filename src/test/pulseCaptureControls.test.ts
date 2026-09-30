import {beforeEach,describe,expect,it,vi} from 'vitest';
import {setDataWindow,selectChartTimeframe} from '../../workers/pulse-spy/capture-source.js';
function browser(){return {evaluate:vi.fn(async(fn,arg)=>fn(arg)),mouse:{move:vi.fn()},waitForFunction:vi.fn(async(fn,_options,arg)=>{if(!fn(arg))throw Error('not ready');})};}
beforeEach(()=>{document.body.innerHTML='';});
describe('batched TradingView controls',()=>{
 it('does not click or reload an already selected timeframe',async()=>{
  document.body.innerHTML='<button role="radio" aria-label="15 minutes" aria-checked="true"></button><div class="chart-widget"><canvas aria-label="Chart for AMEX:SPY, 15 minutes"></canvas></div>';
  const button=document.querySelector('button')!;button.getClientRects=()=>[{}] as unknown as DOMRectList;
  Object.defineProperty(document.querySelector('.chart-widget'),'innerText',{value:'Vault Zone Pulse - SPY Live'});
  const click=vi.spyOn(button,'click');await selectChartTimeframe(browser(),15);expect(click).not.toHaveBeenCalled();
 });
 it('fails instead of selecting a hidden or missing timeframe',async()=>{
  document.body.innerHTML='<button role="radio" aria-label="5 minutes"></button>';
  await expect(selectChartTimeframe(browser(),5)).rejects.toThrow('timeframe-control-unavailable');
 });
 it('closes the data window once and verifies the state',async()=>{
  document.body.innerHTML='<button aria-label="Object tree and data window" aria-pressed="true"></button>';
  const button=document.querySelector('button')!;button.addEventListener('click',()=>button.setAttribute('aria-pressed','false'));
  const click=vi.spyOn(button,'click');const page=browser();await setDataWindow(page,false);await setDataWindow(page,false);expect(click).toHaveBeenCalledTimes(1);
 });
 it('rejects missing data controls',async()=>{await expect(setDataWindow(browser(),true)).rejects.toThrow('chart-zone-data-unavailable');});
});
