import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHmac, webcrypto } from 'node:crypto';
import { captureWindowOpen, verifyCaptureSource, verifyCaptureZone, verifyImageSignature } from '../../workers/pulse-spy/capture-policy.js';
beforeAll(()=>vi.stubGlobal('crypto',webcrypto));
afterAll(()=>vi.unstubAllGlobals());

const now=Date.parse('2026-09-25T16:20:30Z');
const post={symbol:'AMEX:SPY',timeframe:5,at:now-20000,price:770.1,side:'demand',kind:'observed',lower:767.70,upper:768.54};
const zoneText='Supply upper\n∅\nSupply lower\n∅\nDemand upper\n768.54\nDemand lower\n767.70';
const source={label:'Chart for BATS:SPY, 5 minutes',text:'Vault Zone Pulse - SPY Live\n770.10\nSELL',pageText:'Vault Zone Pulse - SPY Live',zoneText};
describe('hosted chart provenance and private delivery',()=>{
  it('accepts the real SPY source at the requested interval',()=>expect(verifyCaptureSource(source,post,now)).toBe(true));
  it('rejects a different instrument, timeframe and missing Pulse indicator',()=>{
    expect(()=>verifyCaptureSource({...source,label:'Chart for CAPITALCOM:SPX500, 5 minutes'},post,now)).toThrow('wrong-chart');
    expect(()=>verifyCaptureSource(source,{...post,timeframe:15},now)).toThrow('wrong-chart');
    expect(()=>verifyCaptureSource({...source,text:'Vault Academy 770 SELL'},post,now)).toThrow('indicator');
  });
  it('never attaches today’s picture to an expired or future event',()=>{
    expect(()=>verifyCaptureSource(source,{...post,at:now-90001},now)).toThrow('capture-window');
    expect(()=>verifyCaptureSource(source,{...post,at:now+1},now)).toThrow('capture-window');
  });
  it('rejects disconnected pages and mismatched quotes',()=>{
    expect(()=>verifyCaptureSource({...source,pageText:'Disconnected from the server'},post,now)).toThrow('chart-needs');
    expect(()=>verifyCaptureSource({...source,text:'Vault Zone Pulse - SPY Live\n765.00 SELL'},post,now)).toThrow('price-mismatch');
  });
  it('matches exact zone boundaries and rejects a different zone even on the correct SPY timeframe',()=>{
    expect(()=>verifyCaptureSource({...source,zoneText:zoneText.replace('768.54','769.78')},post,now)).toThrow('chart-zone-mismatch');
    expect(()=>verifyCaptureSource({...source,zoneText:''},post,now)).toThrow('chart-zone-data-unavailable');
    expect(verifyCaptureZone(zoneText,{...post,kind:'entered'})).toBe(true);
  });
  it('allows a removed zone for a break, but never substitutes a newer zone or omits an active entry zone',()=>{
    const removed=zoneText.replace('768.54','∅').replace('767.70','∅');
    expect(verifyCaptureZone(removed,{...post,kind:'broken'})).toBe(true);
    expect(()=>verifyCaptureZone(removed,{...post,kind:'entered'})).toThrow('chart-zone-mismatch');
    expect(()=>verifyCaptureZone(zoneText.replace('768.54','769.78'),{...post,kind:'broken'})).toThrow('chart-zone-mismatch');
  });
  it('tracks Eastern weekday hours across daylight saving changes',()=>{
    expect(captureWindowOpen(Date.parse('2026-09-25T13:00:00Z'))).toBe(true);
    expect(captureWindowOpen(Date.parse('2026-09-25T20:00:00Z'))).toBe(true);
    expect(captureWindowOpen(Date.parse('2026-09-25T20:01:30Z'))).toBe(false);
    expect(captureWindowOpen(Date.parse('2026-09-26T15:00:00Z'))).toBe(false);
    expect(captureWindowOpen(Date.parse('2026-11-02T13:30:00Z'))).toBe(false);
    expect(captureWindowOpen(Date.parse('2026-11-02T14:00:00Z'))).toBe(true);
  });
  it('allows only signed unexpired image IDs, never private session keys',async()=>{
    const secret='ab'.repeat(32),id='ab678956-8077-430a-8a5f-e220dfdc24c9',expiry=String(Math.floor(now/1000)+1800);
    const signature=createHmac('sha256',Buffer.from(secret,'hex')).update(`${id}:${expiry}`).digest('hex');
    expect(await verifyImageSignature(id,expiry,signature,secret,now)).toBe(true);
    expect(await verifyImageSignature(id,expiry,signature,secret,now+1800000)).toBe(false);
    expect(await verifyImageSignature(id,expiry,'00'.repeat(32),secret,now)).toBe(false);
    expect(await verifyImageSignature('private:login',expiry,signature,secret,now)).toBe(false);
    expect(await verifyImageSignature(id,String(+expiry+3600),signature,secret,now)).toBe(false);
  });
});
