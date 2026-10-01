import {expect,it,vi} from 'vitest';
import {verifyCaptureSource,MULTI_INDICATOR} from '../../workers/pulse-spy/capture-policy.js';
import {selectChartTimeframe} from '../../workers/pulse-spy/capture-source.js';
import {validatePulseSnapshot,postsFromSnapshot} from '../../supabase/functions/_shared/pulse/snapshots';
const now=Date.parse('2026-09-30T15:00:30Z');
const bar=now-30000;
const zone={zoneId:'QQQ:5:demand:123',side:'demand' as const,lower:498,upper:502};
const snapshot={kind:'snapshot',source:'indicator',symbol:'NASDAQ:QQQ',timeframe:5,at:now,barAt:bar,price:500,confirmed:false,zones:[zone],bars:[{t:bar-300000,o:500,h:501,l:498,c:500},{t:bar,o:500,h:501,l:499,c:500}]};
it('accepts genuine QQQ schema and preserves the symbol through events',()=>{
 const data=validatePulseSnapshot(snapshot,now); const posts=postsFromSnapshot([],data,now);
 expect(posts).toHaveLength(1);expect(posts[0].symbol).toBe('NASDAQ:QQQ');expect(posts[0].zoneId).toBe(zone.zoneId);
 expect(()=>validatePulseSnapshot({...snapshot,timeframe:30},now)).toThrow('Wrong chart');
});
it('rejects SPY or an incorrect QQQ indicator as a QQQ image',()=>{
 const post=postsFromSnapshot([],validatePulseSnapshot(snapshot,now),now)[0];
 const source={label:'Chart for NASDAQ:QQQ, 5 minutes',text:MULTI_INDICATOR+'\n500 SELL',pageText:'',zoneText:'Demand lower 498\nDemand upper 502'};
 expect(verifyCaptureSource(source,post,now)).toBe(true);
 expect(()=>verifyCaptureSource({...source,label:'Chart for AMEX:SPY, 5 minutes'},post,now)).toThrow();
 expect(()=>verifyCaptureSource({...source,text:'Vault Zone Pulse - SPY Live\n500 SELL'},post,now)).toThrow('pulse-indicator-missing');
 expect(()=>verifyCaptureSource({...source,zoneText:'Demand lower 490\nDemand upper 495'},post,now)).toThrow('chart-zone-mismatch');
});
it('switches QQQ in the existing page and verifies its symbol after rendering',async()=>{
 const page={evaluate:vi.fn().mockResolvedValueOnce('Chart for AMEX:SPY, 5 minutes').mockResolvedValueOnce(true).mockResolvedValueOnce('Chart for NASDAQ:QQQ, 15 minutes'),goto:vi.fn(),waitForSelector:vi.fn(),mouse:{move:vi.fn()},waitForFunction:vi.fn()};
 await selectChartTimeframe(page,15,'NASDAQ:QQQ');
 expect(page.goto).toHaveBeenCalledTimes(1);expect(page.goto).toHaveBeenCalledWith(expect.stringContaining('symbol=NASDAQ%3AQQQ&interval=15'),expect.anything());
});
it('never accepts a SPY render left behind after a QQQ switch',async()=>{
 const page={evaluate:vi.fn().mockResolvedValueOnce('Chart for AMEX:SPY, 5 minutes').mockResolvedValueOnce(true).mockResolvedValueOnce('Chart for AMEX:SPY, 15 minutes'),goto:vi.fn(),waitForSelector:vi.fn(),mouse:{move:vi.fn()},waitForFunction:vi.fn()};
 await expect(selectChartTimeframe(page,15,'NASDAQ:QQQ')).rejects.toThrow('wrong-instrument');
});
