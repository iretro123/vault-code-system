import {describe,it,expect} from 'vitest';
import {readChartSource,readZoneBounds} from '../../workers/pulse-spy/capture-source.js';
import {sourceIndicator,INDICATOR,MULTI_INDICATOR} from '../../workers/pulse-spy/capture-policy.js';
describe('TradingView zone data validation',()=>{
 it('reads exact visible bounds including absent zones',()=>{
  expect(readZoneBounds('Demand lower ∅ Demand upper ∅ Supply upper 764.68 Supply lower 764.42')).toEqual({demand:{lower:null,upper:null},supply:{lower:764.42,upper:764.68}});
 });
 it('rejects partially rendered values instead of claiming readiness',()=>{
  expect(()=>readZoneBounds('Demand lower ∅ Demand upper ∅ Supply upper 764.68')).toThrow('chart-zone-data-unavailable');
 });
 it('rejects reversed or incomplete zones',()=>{
  expect(()=>readZoneBounds('Demand lower ∅ Demand upper ∅ Supply upper 764.42 Supply lower 764.68')).toThrow('chart-zone-mismatch');
  expect(()=>readZoneBounds('Demand lower ∅ Demand upper 760 Supply upper ∅ Supply lower ∅')).toThrow('chart-zone-mismatch');
 });
});

it('reads the shared study rather than a legacy study left on the layout',async()=>{
 document.body.innerHTML='<div class="chart-widget"><canvas aria-label="Chart for NASDAQ:QQQ, 5 minutes"></canvas></div><div role="row">legacy</div><div role="row">shared</div>';
 const rows=document.querySelectorAll('[role="row"]');
 Object.defineProperty(rows[0],'innerText',{value:'Vault Zone Pulse - SPY Live Demand lower 1 Demand upper 2'});
 Object.defineProperty(rows[1],'innerText',{value:'Vault Zone Pulse - SPY & QQQ Demand lower 3 Demand upper 4'});
 const source=await readChartSource({evaluate:async(fn)=>fn()});
 expect(source.zoneText).toContain('Demand lower 3');
 document.querySelector('canvas')!.setAttribute('aria-label','Chart for AMEX:SPY, 5 minutes');
 const spy=await readChartSource({evaluate:async(fn)=>fn()});
 expect(spy.zoneText).toContain('Demand lower 3');
 expect(sourceIndicator(INDICATOR+'\n'+MULTI_INDICATOR,'AMEX:SPY')).toBe(MULTI_INDICATOR);
 expect(sourceIndicator(INDICATOR+'\n'+MULTI_INDICATOR,'NASDAQ:QQQ')).toBe(MULTI_INDICATOR);
 rows[1].remove();
 expect((await readChartSource({evaluate:async(fn)=>fn()})).zoneText).toBe('');
 document.querySelector('canvas')!.setAttribute('aria-label','Chart for NASDAQ:QQQ, 5 minutes');
 expect((await readChartSource({evaluate:async(fn)=>fn()})).zoneText).toBe('');
 document.body.innerHTML='';
});

it('does not borrow bounds from an enclosing row containing both studies',async()=>{
 document.body.innerHTML='<div class="chart-widget"><canvas aria-label="Chart for NASDAQ:QQQ, 5 minutes"></canvas></div><div role="row" id="outer"><div role="row" id="legacy"></div><div role="row" id="shared"></div></div>';
 const legacy='Vault Zone Pulse - SPY Live Demand lower 100 Demand upper 101 Supply lower ∅ Supply upper ∅';
 const shared='Vault Zone Pulse - SPY & QQQ Demand lower 739 Demand upper 740 Supply lower ∅ Supply upper ∅';
 for(const [id,text] of Object.entries({outer:legacy+'\n'+shared,legacy,shared})) Object.defineProperty(document.getElementById(id),'innerText',{value:text});
 const source=await readChartSource({evaluate:async(fn)=>fn()});
 expect(readZoneBounds(source.zoneText).demand).toEqual({lower:739,upper:740});
 expect(source.enclosingStudyRows).toBe(1);
 document.body.innerHTML='';
});
