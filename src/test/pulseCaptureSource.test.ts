import {describe,it,expect} from 'vitest';
import {readZoneBounds} from '../../workers/pulse-spy/capture-source.js';
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
