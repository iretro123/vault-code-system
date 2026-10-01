import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({connect:vi.fn(),acquire:vi.fn(),create:vi.fn(),sessions:vi.fn()}));
vi.mock('../../workers/pulse-spy/node_modules/@cloudflare/puppeteer/lib/esm/puppeteer/puppeteer-cloudflare.js',()=>({default:mocks}));
vi.mock('../../workers/pulse-spy/node_modules/@cloudflare/puppeteer/lib/esm/puppeteer/cloudflare/WorkersWebSocketTransport.js',()=>({WorkersWebSocketTransport:{create:mocks.create}}));
import { captureTargetFilter, connectChartBrowser, prepareChartReplacement } from '../../workers/pulse-spy/capture-connection.js';
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
describe('chart connection watchdog',()=>{
 it('attaches chart tabs without waiting on editor and analytics workers',()=>{
  for(const type of ['page','tab','browser']) expect(captureTargetFilter({type:()=>type})).toBe(true);
  for(const type of ['service_worker','shared_worker','other','background_page']) expect(captureTargetFilter({type:()=>type})).toBe(false);
 });
 it('does not abort an upgraded socket after the handshake deadline',async()=>{
  vi.useFakeTimers();let signal: AbortSignal;
  const binding={fetch:vi.fn(async(_url,init)=>{signal=init.signal;return {};})};
  const transport={close:vi.fn()};
  mocks.create.mockImplementationOnce(async endpoint=>{await endpoint.fetch('https://example.test',{headers:{Upgrade:'websocket'}});return transport;});
  mocks.connect.mockResolvedValue({disconnect:vi.fn()});
  const browser=await connectChartBrowser(binding,'dedicated');
  await vi.advanceTimersByTimeAsync(7000);
  expect(signal!.aborted).toBe(false);expect(transport.close).not.toHaveBeenCalled();
  await browser.disconnect();
 });

 it('closes the actual transport at the deadline, rejecting stuck commands',async()=>{
  vi.useFakeTimers();const transport={close:vi.fn()};const browser={disconnect:vi.fn()};
  mocks.create.mockResolvedValue(transport);mocks.connect.mockResolvedValue(browser);
  const connected=await connectChartBrowser({},'dedicated',22000);
  expect(mocks.connect).toHaveBeenCalledWith({transport,protocolTimeout:6000,defaultViewport:null,targetFilter:captureTargetFilter});
  await vi.advanceTimersByTimeAsync(22000);expect(transport.close).toHaveBeenCalledOnce();
  await connected.disconnect();expect(browser.disconnect).toBeDefined();
 });
 it('rejects a stalled initialization even when transport callbacks throw',async()=>{
  vi.useFakeTimers();
  const transport={close:vi.fn(()=>{throw new Error('closed');}),onclose:vi.fn(()=>{throw new Error('callback');})};
  mocks.create.mockResolvedValue(transport);mocks.connect.mockImplementationOnce(()=>new Promise(()=>{}));
  const result=expect(connectChartBrowser({},'dedicated',1000)).rejects.toThrow('hosted-browser-timeout');
  await vi.advanceTimersByTimeAsync(1000);await result;
  expect(transport.close).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
 });
 it('cleans up a failed handshake and exposes no provider secrets',async()=>{
  vi.useFakeTimers();const transport={close:vi.fn()};mocks.create.mockResolvedValue(transport);mocks.connect.mockRejectedValue(new Error('private URL'));
  await expect(connectChartBrowser({},'dedicated')).rejects.toThrow('hosted-browser-timeout');
  expect(transport.close).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
 });
 it('clears watchdog on normal disconnect and leaves no delayed close',async()=>{
  vi.useFakeTimers();const transport={close:vi.fn()};const disconnect=vi.fn();mocks.create.mockResolvedValue(transport);mocks.connect.mockResolvedValue({disconnect});
  const browser=await connectChartBrowser({},'dedicated');await browser.disconnect();
  await vi.advanceTimersByTimeAsync(30000);expect(disconnect).toHaveBeenCalledOnce();expect(transport.close).toHaveBeenCalledOnce();
 });
});

describe('dedicated stalled session retirement',()=>{
 it('never closes a connected session',async()=>{
  mocks.sessions.mockResolvedValue([{sessionId:'owned',connectionId:'busy'}]);
  const env={BROWSER:{fetch:vi.fn()},CHART_IMAGES:{get:vi.fn(),put:vi.fn()}};
  await expect(prepareChartReplacement(env,'owned')).rejects.toThrow('hosted-browser-recovering');
  expect(env.BROWSER.fetch).not.toHaveBeenCalled();
 });
 it('retires only the repeatedly failed free session, then verifies it is gone',async()=>{
  mocks.sessions.mockResolvedValueOnce([{sessionId:'owned'},{sessionId:'unrelated'}]).mockResolvedValueOnce([{sessionId:'unrelated'}]);
  const env={BROWSER:{fetch:vi.fn().mockResolvedValue({ok:true})},CHART_IMAGES:{get:vi.fn(async k=>k.includes('failed-connect')?'1':null),put:vi.fn()}};
  await prepareChartReplacement(env,'owned');
  expect(env.BROWSER.fetch).toHaveBeenCalledWith('https://fake.host/v1/devtools/browser/owned',expect.objectContaining({method:'DELETE'}));
  expect(mocks.sessions).toHaveBeenCalledTimes(2);
 });
 it('leaves a first timeout alone and throttles repeated retirements',async()=>{
  mocks.sessions.mockResolvedValue([{sessionId:'owned'}]);
  const env={BROWSER:{fetch:vi.fn()},CHART_IMAGES:{get:vi.fn().mockResolvedValue(null),put:vi.fn()}};
  await expect(prepareChartReplacement(env,'owned')).rejects.toThrow('hosted-browser-recovering');
  env.CHART_IMAGES.get.mockImplementation(async k=>k.includes('failed-connect')?'3':String(Date.now()));
  await expect(prepareChartReplacement(env,'owned')).rejects.toThrow('hosted-browser-recovering');
  expect(env.BROWSER.fetch).not.toHaveBeenCalled();
 });
});
