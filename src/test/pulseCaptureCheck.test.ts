vi.mock('../../workers/pulse-spy/capture-framing.js',()=>({frameChart:vi.fn()}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
const session=vi.hoisted(()=>({openChartSession:vi.fn(),rememberChartLogin:vi.fn()}));
vi.mock('../../workers/pulse-spy/capture-session.js',()=>session);
import { checkChartConnection } from '../../workers/pulse-spy/capture-check.js';
beforeEach(()=>vi.clearAllMocks());
function setup(source:object) {
 const page={url:()=> 'https://www.tradingview.com/chart/Db5ipsDu/',evaluate:vi.fn().mockResolvedValue({zoneText:'Demand lower ∅ Demand upper ∅ Supply lower 764.42 Supply upper 764.68',...source}),mouse:{move:vi.fn()},waitForFunction:vi.fn(),setViewport:vi.fn(),$:vi.fn().mockResolvedValue({evaluate:vi.fn().mockResolvedValue('true'),boundingBox:vi.fn().mockResolvedValue({width:1100,height:700}),screenshot:vi.fn().mockResolvedValue(new Uint8Array(11000))})};
 const browser={pages:vi.fn().mockResolvedValue([page]),disconnect:vi.fn()};
 session.openChartSession.mockResolvedValue(browser);
 return browser;
}
describe('operator chart preflight',()=>{
 it('checks a real chart after hours without writing an event or enabling capture',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-30T01:00:00Z'));
  try {
   const browser=setup({label:'Chart for BATS:SPY, 15 minutes',text:'Vault Zone Pulse - SPY Live',pageText:'SPY'});
   const env={BROWSER:{},CHART_IMAGES:{put:vi.fn()}};
   expect(await checkChartConnection(env)).toMatchObject({ok:true,symbol:'AMEX:SPY',timeframe:15,indicator:'Vault Zone Pulse - SPY Live',imageId:expect.any(String)});
   expect(browser.disconnect).toHaveBeenCalledOnce();
  } finally {vi.useRealTimers();}
 });
 it('rejects a disconnected account even if the chart remains visible',async()=>{
  setup({label:'Chart for AMEX:SPY, 5 minutes',text:'Vault Zone Pulse - SPY Live',pageText:'Session disconnected'});
  expect(await checkChartConnection({BROWSER:{},CHART_IMAGES:{put:vi.fn()}})).toEqual({ok:false,failure:'hosted-chart-login-required'});
  expect(session.rememberChartLogin).not.toHaveBeenCalled();
 });
 it('does not return private browser exceptions',async()=>{
  session.openChartSession.mockRejectedValue(new Error('secret cookie and private URL'));
  expect(await checkChartConnection({BROWSER:{},CHART_IMAGES:{put:vi.fn()}})).toEqual({ok:false,failure:'hosted-chart-login-required'});
 });
});
