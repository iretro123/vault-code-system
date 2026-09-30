import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
const connection=vi.hoisted(()=>({connectChartBrowser:vi.fn(),acquireChartBrowser:vi.fn()}));
const reconnect=vi.hoisted(()=>vi.fn());
vi.mock('../../workers/pulse-spy/capture-connection.js',()=>connection);
vi.mock('../../workers/pulse-spy/capture-reconnect.js',()=>({reconnectChart:reconnect}));
import { openChartSession } from '../../workers/pulse-spy/capture-session.js';
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('crypto',webcrypto);reconnect.mockResolvedValue(undefined);});
afterEach(()=>vi.unstubAllGlobals());
async function fixture(){
 const key='ab'.repeat(32);const imported=await webcrypto.subtle.importKey('raw',new Uint8Array(32).fill(171),'AES-GCM',false,['encrypt']);const iv=new Uint8Array(12);const encrypted=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},imported,new TextEncoder().encode(JSON.stringify([{domain:'.tradingview.com',name:'session',value:'test'}])));const sealed=new Uint8Array(12+encrypted.byteLength);sealed.set(new Uint8Array(encrypted),12);
 const values=new Map<string,unknown>([['private:session','old'],['private:login',sealed.buffer]]);
 const env={BROWSER:{},CAPTURE_SAVE_LOGIN:'true',CAPTURE_AUTH_KEY:key,CHART_IMAGES:{get:vi.fn(async k=>values.get(k)||null),put:vi.fn(async(k,v)=>{values.set(k,v);})}};
 const page={url:()=> 'https://www.tradingview.com/chart/Db5ipsDu/',setCookie:vi.fn(),goto:vi.fn(),waitForSelector:vi.fn()};const browser={pages:vi.fn().mockResolvedValue([page]),newPage:vi.fn().mockResolvedValue(page),disconnect:vi.fn(),close:vi.fn()};
 return {env,browser,page,values};
}
describe('automatic dedicated chart recovery',()=>{
 it('restores an expired session using only encrypted approved cookies',async()=>{
  const {env,browser,page}=await fixture();connection.connectChartBrowser.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(browser);connection.acquireChartBrowser.mockResolvedValue({sessionId:'replacement'});
  expect(await openChartSession(env)).toBe(browser);expect(page.setCookie).toHaveBeenCalledOnce();expect(env.CHART_IMAGES.put).toHaveBeenCalledWith('private:session','replacement');
 });
 it('keeps a slow restored page for the next attempt instead of destroying its progress',async()=>{
  const {env,browser,page}=await fixture();connection.connectChartBrowser.mockRejectedValueOnce(new Error('expired')).mockResolvedValue(browser);connection.acquireChartBrowser.mockResolvedValue({sessionId:'replacement'});page.goto.mockRejectedValue(new Error('navigation timeout'));
  await expect(openChartSession(env)).rejects.toThrow('restore-navigation-failed');
  expect(browser.close).not.toHaveBeenCalled();expect(browser.disconnect).toHaveBeenCalledOnce();
  page.goto.mockResolvedValue(undefined);
  expect(await openChartSession(env)).toBe(browser);expect(connection.acquireChartBrowser).toHaveBeenCalledOnce();
 });
 it('never replaces a browser to bypass a TradingView session conflict',async()=>{
  const {env,browser}=await fixture();connection.connectChartBrowser.mockResolvedValue(browser);reconnect.mockRejectedValue(new Error('chart-session-conflict'));
  await expect(openChartSession(env)).rejects.toThrow('chart-session-conflict');expect(connection.acquireChartBrowser).not.toHaveBeenCalled();expect(browser.disconnect).toHaveBeenCalledOnce();
 });
 it('throttles replacements when the provider remains unavailable',async()=>{
  const {env,values}=await fixture();values.set('private:restore-at',String(Date.now()));connection.connectChartBrowser.mockRejectedValue(new Error('timeout'));
  await expect(openChartSession(env)).rejects.toThrow('hosted-browser-recovering');expect(connection.acquireChartBrowser).not.toHaveBeenCalled();
 });
});
