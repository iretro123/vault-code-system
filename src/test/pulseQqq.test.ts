import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {verifyCaptureSource,MULTI_INDICATOR} from '../../workers/pulse-spy/capture-policy.js';
import {selectChartTimeframe,navigateCaptureChart} from '../../workers/pulse-spy/capture-source.js';
import {validatePulseSnapshot,postsFromSnapshot} from '../../supabase/functions/_shared/pulse/snapshots';
const now=Date.parse('2026-09-30T15:00:30Z');
const bar=now-30000;
const zone={zoneId:'QQQ:5:demand:123',side:'demand' as const,lower:498,upper:502};
const snapshot={kind:'snapshot',source:'indicator',symbol:'NASDAQ:QQQ',timeframe:5,at:now,barAt:bar,price:500,confirmed:false,zones:[zone],bars:[{t:bar-300000,o:500,h:501,l:498,c:500},{t:bar,o:500,h:501,l:499,c:500}]};
it('preserves SPY zone-removal calculations independently of marker visibility',()=>{
 const original=readFileSync('scripts/vault-zone-pulse-live.pine','utf8');
 const shared=readFileSync('scripts/vault-zone-pulse-multi.pine','utf8');
 for(const signal of ['buySignal','sellSignal']) {
  const base=original.match(new RegExp('^'+signal+' = (.*)$','m'))![1].replace('showSignals and ','');
  expect(shared.match(new RegExp('^'+signal+' = (.*)$','m'))![1]).toBe(base);
  expect(shared).toContain('plotshape(showSignals and '+signal+',');
 }
});
it('accepts genuine QQQ schema and preserves the symbol through events',()=>{
 const data=validatePulseSnapshot(snapshot,now); const posts=postsFromSnapshot([],data,now);
 expect(posts).toHaveLength(1);expect(posts[0].symbol).toBe('NASDAQ:QQQ');expect(posts[0].zoneId).toBe(zone.zoneId);
 expect(()=>validatePulseSnapshot({...snapshot,timeframe:30},now)).toThrow('Wrong chart');
});
it('records repeated entries within a candle without duplicating the same delivery',()=>{
 const make=(offset:number,price:number)=>validatePulseSnapshot({...snapshot,at:now+offset,price,bars:[snapshot.bars[0],{t:bar,o:500,h:504,l:497,c:price}]},now+offset);
 let posts=postsFromSnapshot([],make(0,503),now);
 posts=postsFromSnapshot(posts,make(15000,500),now+15000);
 posts=postsFromSnapshot(posts,make(30000,503),now+30000);
 const reentry=make(45000,500);
 posts=postsFromSnapshot(posts,reentry,now+45000);
 expect(posts.map(p=>p.kind)).toEqual(['observed','entered','exited','entered']);
 expect(new Set(posts.map(p=>p.id)).size).toBe(4);
 expect(postsFromSnapshot(posts,reentry,now+45000)).toEqual(posts);
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
 const page={on:vi.fn(),off:vi.fn(),evaluate:vi.fn().mockResolvedValueOnce('Chart for AMEX:SPY, 5 minutes').mockResolvedValueOnce(true).mockResolvedValueOnce('Chart for NASDAQ:QQQ, 15 minutes'),goto:vi.fn(),waitForSelector:vi.fn(),mouse:{move:vi.fn()},waitForFunction:vi.fn()};
 await selectChartTimeframe(page,15,'NASDAQ:QQQ');
 expect(page.goto).toHaveBeenCalledTimes(1);expect(page.goto).toHaveBeenCalledWith(expect.stringContaining('symbol=NASDAQ%3AQQQ&interval=15'),expect.anything());
});
it('never accepts a SPY render left behind after a QQQ switch',async()=>{
 const page={on:vi.fn(),off:vi.fn(),evaluate:vi.fn().mockResolvedValueOnce('Chart for AMEX:SPY, 5 minutes').mockResolvedValueOnce(true).mockResolvedValueOnce('Chart for AMEX:SPY, 15 minutes'),goto:vi.fn(),waitForSelector:vi.fn(),mouse:{move:vi.fn()},waitForFunction:vi.fn()};
 await expect(selectChartTimeframe(page,15,'NASDAQ:QQQ')).rejects.toThrow('wrong-instrument');
});

it('answers only leave-page dialogs during an authorized symbol navigation',async()=>{
 let handler: (dialog:any)=>void;
 const accept=vi.fn().mockResolvedValue(undefined),dismiss=vi.fn().mockResolvedValue(undefined);
 const page={on:vi.fn((_event,fn)=>{handler=fn;}),off:vi.fn(),goto:vi.fn(async()=>{handler({type:()=> 'beforeunload',accept,dismiss});})};
 await navigateCaptureChart(page,'https://www.tradingview.com/chart/Db5ipsDu/?symbol=NASDAQ%3AQQQ&interval=5');
 expect(accept).toHaveBeenCalledOnce();expect(dismiss).not.toHaveBeenCalled();expect(page.off).toHaveBeenCalledWith('dialog',handler!);
 page.goto.mockImplementation(async()=>{handler({type:()=> 'confirm',accept,dismiss});});
 accept.mockClear();
 await expect(navigateCaptureChart(page,'https://www.tradingview.com/chart/Db5ipsDu/?symbol=NASDAQ%3AQQQ&interval=5')).rejects.toThrow('chart-needs-attention');
 expect(accept).not.toHaveBeenCalled();expect(dismiss).toHaveBeenCalledOnce();
});
