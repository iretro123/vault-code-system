vi.mock('../../workers/pulse-spy/liquidity-capture.js',()=>({liquidityVisibility:vi.fn()}));
vi.mock('../../workers/pulse-spy/capture-source.js',async importOriginal=>({...await importOriginal(),setDataWindow:vi.fn(),selectChartTimeframe:vi.fn()}));
vi.mock('../../workers/pulse-spy/capture-framing.js',()=>({frameChart:vi.fn()}));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
const session=vi.hoisted(()=>({openChartSession:vi.fn(),rememberChartLogin:vi.fn()}));
vi.mock('../../workers/pulse-spy/capture-session.js',()=>session);
import { runCapture, drainCaptures } from '../../workers/pulse-spy/capture.js';

const now=Date.parse('2026-09-25T17:00:30Z');
const post={id:'event',symbol:'AMEX:SPY',timeframe:5,at:now-1000,price:770,side:'demand',kind:'entered',lower:767.7,upper:768.54};
const source={label:'Chart for BATS:SPY, 5 minutes',text:'Vault Zone Pulse - SPY Live\n770.00 SELL',pageText:'Vault Zone Pulse - SPY Live',zoneText:'Demand upper\n768.54\nDemand lower\n767.70'};
function fixture(){
  const chart={boundingBox:vi.fn().mockResolvedValue({width:1100,height:800}),screenshot:vi.fn().mockResolvedValue(new Uint8Array(11000))};
  const control={boundingBox:vi.fn().mockResolvedValue({width:30,height:30}),click:vi.fn(),focus:vi.fn(),press:vi.fn(),evaluate:vi.fn().mockResolvedValue('true')};
  const page={screenshot:chart.screenshot,url:()=> 'https://www.tradingview.com/chart/Db5ipsDu/',setDefaultTimeout:vi.fn(),setViewport:vi.fn(),$$:vi.fn().mockResolvedValue([control]),$:vi.fn(selector=>Promise.resolve(selector==='.chart-widget'?chart:control)),mouse:{move:vi.fn()},waitForFunction:vi.fn(),evaluate:vi.fn().mockResolvedValue(source)};
  const browser={pages:vi.fn().mockResolvedValue([page]),disconnect:vi.fn()};
  session.openChartSession.mockResolvedValue(browser);
  session.rememberChartLogin.mockResolvedValue(undefined);
  const env={BROWSER:{},CHART_IMAGES:{put:vi.fn()}};
  const rpc=vi.fn().mockResolvedValueOnce({lease:'lease',post}).mockResolvedValue(true);
  return {chart,page,browser,env,rpc};
}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(now);vi.stubGlobal('crypto',webcrypto);vi.clearAllMocks();});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('durable screenshot processing',()=>{
  it('recovers through the session manager without requiring an initial session ID',async()=>{
    const {env,rpc,page,chart}=fixture();
    expect(await runCapture(env,rpc)).toBe('more');
    expect(page.setViewport).toHaveBeenCalledWith({width:1280,height:800,deviceScaleFactor:2});
    expect(chart.screenshot).toHaveBeenCalledWith({type:'png',clip:{width:1100,height:800},captureBeyondViewport:false});
    expect(session.openChartSession).toHaveBeenCalledWith(env,28000);
    expect(rpc).toHaveBeenLastCalledWith('pulse_spy_capture_finish',expect.objectContaining({p_event_id:'event',p_result:expect.objectContaining({ok:true,timeframe:5,symbol:'AMEX:SPY'})}),5000);
  });
  it('rejects a portrait crop rather than publishing another tall chart',async()=>{
    const {env,rpc,chart}=fixture();chart.boundingBox.mockResolvedValue({width:1000,height:1200});
    expect(await runCapture(env,rpc)).toBe('retry');
    expect(chart.screenshot).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenLastCalledWith('pulse_spy_capture_finish',expect.objectContaining({p_result:expect.objectContaining({ok:false,failure:'chart-crop-unavailable'})}),5000);
  });
  it('persists missing binding failures instead of silently returning',async()=>{
    const {rpc}=fixture();
    expect(await runCapture({},rpc)).toBe('retry');
    expect(rpc).toHaveBeenLastCalledWith('pulse_spy_capture_finish',expect.objectContaining({p_result:expect.objectContaining({ok:false,failure:'hosted-browser-not-configured'})}),5000);
  });
  it('reports a lost TradingView login without leaking provider details',async()=>{
    const {env,rpc}=fixture();session.openChartSession.mockRejectedValue(new Error('hosted-chart-login-required'));
    expect(await runCapture(env,rpc)).toBe('retry');
    expect(rpc).toHaveBeenLastCalledWith('pulse_spy_capture_finish',expect.objectContaining({p_result:expect.objectContaining({ok:false,failure:'hosted-chart-login-required'})}),5000);
  });
  it('rejects a zone that changed during screenshot capture',async()=>{
    const {env,rpc,page}=fixture();page.evaluate.mockResolvedValueOnce(source).mockResolvedValueOnce({...source,zoneText:source.zoneText.replace('768.54','769.78')});
    expect(await runCapture(env,rpc)).toBe('retry');
    expect(env.CHART_IMAGES.put).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenLastCalledWith('pulse_spy_capture_finish',expect.objectContaining({p_result:expect.objectContaining({ok:false,failure:'chart-zone-mismatch'})}),5000);
  });
  it('persists a completed capture even if browser disconnect throws',async()=>{
    const {env,rpc,browser}=fixture();browser.disconnect.mockRejectedValue(new Error('connection gone'));
    expect(await runCapture(env,rpc)).toBe('more');
    expect(rpc).toHaveBeenLastCalledWith('pulse_spy_capture_finish',expect.objectContaining({p_result:expect.objectContaining({ok:true})}),5000);
  });
  it('publishes the verified image when encrypted session backup fails',async()=>{
    const {env,rpc}=fixture();session.rememberChartLogin.mockRejectedValueOnce(new Error('storage unavailable'));
    expect(await runCapture(env,rpc)).toBe('more');
    expect(env.CHART_IMAGES.put).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenLastCalledWith('pulse_spy_capture_finish',expect.objectContaining({p_result:expect.objectContaining({ok:true})}),5000);
  });
  it('never reports success when its database lease was lost',async()=>{
    const {env,rpc}=fixture();rpc.mockReset().mockResolvedValueOnce({lease:'lease',post}).mockResolvedValueOnce(false);
    await expect(runCapture(env,rpc)).rejects.toThrow('capture-lease-lost');
  });
  it('keeps draining fresh work after a failed capture and retains its retry wake',async()=>{
    const {env,rpc}=fixture();
    session.openChartSession.mockRejectedValueOnce(new Error('hosted-chart-login-required'));
    rpc.mockReset().mockResolvedValueOnce({lease:'one',post}).mockResolvedValueOnce(true).mockResolvedValueOnce({lease:'two',post:{...post,id:'event-two'}}).mockResolvedValueOnce(true).mockResolvedValueOnce(null);
    expect(await drainCaptures(env,rpc)).toBe(false);
    expect(env.CHART_IMAGES.put).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(5);
  });
  it('checks idle connection health without resizing or capturing the chart',async()=>{
    const {env,rpc,page}=fixture();rpc.mockReset().mockResolvedValueOnce({lease:'health',post:null}).mockResolvedValueOnce(true);
    expect(await runCapture(env,rpc)).toBe('idle');
    expect(page.setViewport).not.toHaveBeenCalled();expect(page.screenshot).not.toHaveBeenCalled();
  });
  it('retains the durable wake when another consumer owns the browser lease',async()=>{
    const {env,rpc}=fixture();rpc.mockReset().mockResolvedValueOnce({busy:true});
    expect(await drainCaptures(env,rpc)).toBe(false);
    expect(session.openChartSession).not.toHaveBeenCalled();
  });
  it('yields slow immediate captures to durable recovery before starting image work',async()=>{
    const {env,rpc,page}=fixture();page.setViewport.mockImplementation(async()=>vi.advanceTimersByTime(23000));
    expect(await runCapture(env,rpc,22000)).toBe('retry');expect(page.screenshot).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenLastCalledWith('pulse_spy_capture_finish',expect.objectContaining({p_result:expect.objectContaining({failure:'capture-budget-exceeded'})}),5000);
  });
  it('drains two simultaneous timeframe jobs instead of leaving the second one for another alert',async()=>{
    const {env,rpc}=fixture();rpc.mockReset().mockResolvedValueOnce({lease:'one',post}).mockResolvedValueOnce(true).mockResolvedValueOnce({lease:'two',post:{...post,id:'event-two'}}).mockResolvedValueOnce(true).mockResolvedValueOnce(null);
    expect(await drainCaptures(env,rpc)).toBe(true);
    expect(env.CHART_IMAGES.put).toHaveBeenCalledTimes(2);
  });
});
