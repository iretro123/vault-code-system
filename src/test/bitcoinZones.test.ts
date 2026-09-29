import { describe, it, expect } from "vitest";
import { appendBitcoinZone, parseBitcoinZone } from "../lib/bitcoinZones";
const event = {id:"btc-1",zoneId:"btc-zone",symbol:"COINBASE:BTCUSD",timeframe:5,kind:"created",side:"demand",lower:80000,upper:80100,price:80200,at:1789833600000,confirmed:true,trend:"unknown"};
describe("Bitcoin webhook events", () => {
  it("accepts Bitcoin on weekends without changing equity gates", () => expect(parseBitcoinZone(event).symbol).toBe("COINBASE:BTCUSD"));
  it.each([{symbol:"SPY"},{timeframe:1},{price:NaN},{id:"../bad"},{kind:"buy"}])("rejects invalid event %j", patch => expect(() => parseBitcoinZone({...event,...patch})).toThrow());
  it("strips untrusted screenshot URLs", () => expect(parseBitcoinZone({...event,chartUrl:"https://evil.invalid"}).chartUrl).toBeUndefined());
  it("requires touch before holding and confirmed close for break", () => {
    const posts = appendBitcoinZone([],event);
    expect(() => appendBitcoinZone(posts,{...event,id:"hold",kind:"holding"})).toThrow();
    expect(() => appendBitcoinZone(posts,{...event,id:"break",kind:"broken",price:79999,confirmed:false})).toThrow();
  });
  it("keeps chronological lifecycle, deduplicates, and never resurrects broken zones", () => {
    let posts = appendBitcoinZone([],event);
    posts = appendBitcoinZone(posts,{...event,id:"touch",kind:"entered",price:80050,at:event.at+1000});
    posts = appendBitcoinZone(posts,{...event,id:"hold",kind:"holding",at:event.at+2000});
    posts = appendBitcoinZone(posts,{...event,id:"break",kind:"broken",price:79999,at:event.at+3000});
    expect(posts).toHaveLength(4);
    expect(appendBitcoinZone(posts,{...event,id:"late",kind:"entered",price:80050,at:event.at+4000})).toBe(posts);
    expect(appendBitcoinZone(posts,event)).toBe(posts);
  });
});
