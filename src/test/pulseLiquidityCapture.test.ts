import {describe,it,expect} from 'vitest';
import {readLiquidityLevels,verifyLiquiditySource} from '../../workers/pulse-spy/liquidity-capture.js';
const now=Date.now();
const task={timeframe:5,quoteAt:now-1000,price:768};
const source={label:'Chart for AMEX:SPY, 5 minutes',text:'Vault Zone Pulse - SPY Live Vault Pulse - Liquidity 768.00 SELL',pageText:''};
describe('independent liquidity provenance',()=>{
 it('reads actual levels and empty sides without inventing data',()=>{
 expect(readLiquidityLevels('Liquidity reference above 769.12 Liquidity reference below ∅')).toEqual({above:769.12,below:null});
 expect(()=>readLiquidityLevels('unavailable')).toThrow();
 });
 it('allows a genuine chart independently of supply/demand zones',()=>{expect(()=>verifyLiquiditySource(source,task,now)).not.toThrow()});
 it('rejects other timeframes, stale quotes, missing study and session conflicts',()=>{
 for(const bad of [{...task,timeframe:1},{...task,timeframe:15},{...task,quoteAt:now-91000}]) expect(()=>verifyLiquiditySource(source,bad,now)).toThrow();
 expect(()=>verifyLiquiditySource({...source,text:'768 SELL'},task,now)).toThrow();
 expect(()=>verifyLiquiditySource({...source,pageText:'Session disconnected'},task,now)).toThrow();
 });
});
