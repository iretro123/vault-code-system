import { expect, it } from 'vitest';
import { parseStockAnalysis } from '../../scripts/stockAnalysisSource';
const html = `Stock Indexes - Sep 14, 2026<table id="main-table"><thead><tr><th id="s">Symbol</th><th id="n">Company</th><th id="change">Change</th><th id="price">Price</th><th id="volume">Volume</th><th id="marketCap">Cap</th></tr></thead><tbody><tr><td>NVDA</td><td>NVIDIA</td><td>-3.36%</td><td>210.96</td><td>132,190,863</td><td>5.09T</td></tr></tbody></table>`;
it('reads source rows and keeps retrieval time separate from price time',()=>{
  const result=parseStockAnalysis(html,false,new Date('2026-09-15T02:00:00Z'));
  expect(result.observedAt).toBeNull();expect(result.sourceDate).toBe('2026-09-14');
  expect(result.items[0].symbol).toBe('NVDA');expect(result.items[0].detail).toContain('Moved down');
});
it('fails closed when source markup changes or its date is too old',()=>{
  expect(()=>parseStockAnalysis(html.replace('id="volume"','id="other"'),false,new Date('2026-09-15T02:00:00Z'))).toThrow();
  expect(()=>parseStockAnalysis(html,false,new Date('2026-10-15T02:00:00Z'))).toThrow();
});
