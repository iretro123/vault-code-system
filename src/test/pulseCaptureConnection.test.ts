import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({connect:vi.fn(),acquire:vi.fn(),create:vi.fn()}));
vi.mock('../../workers/pulse-spy/node_modules/@cloudflare/puppeteer/lib/esm/puppeteer/puppeteer-cloudflare.js',()=>({default:mocks}));
vi.mock('../../workers/pulse-spy/node_modules/@cloudflare/puppeteer/lib/esm/puppeteer/cloudflare/WorkersWebSocketTransport.js',()=>({WorkersWebSocketTransport:{create:mocks.create}}));
import { connectChartBrowser } from '../../workers/pulse-spy/capture-connection.js';
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
describe('chart connection watchdog',()=>{
 it('closes the actual transport at the deadline, rejecting stuck commands',async()=>{
  vi.useFakeTimers();const transport={close:vi.fn()};const browser={disconnect:vi.fn()};
  mocks.create.mockResolvedValue(transport);mocks.connect.mockResolvedValue(browser);
  const connected=await connectChartBrowser({},'dedicated',22000);
  expect(mocks.connect).toHaveBeenCalledWith({transport,protocolTimeout:6000,defaultViewport:null});
  await vi.advanceTimersByTimeAsync(22000);expect(transport.close).toHaveBeenCalledOnce();
  await connected.disconnect();expect(browser.disconnect).toBeDefined();
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
