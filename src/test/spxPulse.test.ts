import { describe, expect, it } from "vitest";
import { appendPulsePost, pulseWindowOpen, validatePulsePost, type PulsePost } from "@/lib/spxPulse";
const now = Date.parse("2026-09-24T14:00:00Z");
const baseline: PulsePost = { id: "zone-baseline", zoneId: "supply-5", symbol: "CAPITALCOM:SPX500", timeframe: 5, side: "supply", kind: "observed", source: "indicator", at: now, lower: 7658, upper: 7664, price: 7650, confirmed: false };
const event = (changes: Partial<PulsePost>) => ({...baseline, ...changes});
describe("SPX500 source and session validation", () => {
  it("matches the exact provider, symbol, and timeframe", () => {
    expect(validatePulsePost(baseline,now)).toEqual(baseline);
    expect(()=>validatePulsePost({...baseline,symbol:"OANDA:SPX500USD"},now)).toThrow("Wrong chart");
    expect(()=>validatePulsePost({...baseline,timeframe:1},now)).toThrow("Wrong chart");
  });
  it("honors 9–4 New York with DST, weekends, and exclusive close", () => {
    for(const [at,expected] of [["2026-09-24T12:59:59Z",false],["2026-09-24T13:00:00Z",true],["2026-09-24T20:00:00Z",false],["2026-09-26T14:00:00Z",false],["2026-01-15T13:59:00Z",false],["2026-01-15T14:00:00Z",true]] as const) expect(pulseWindowOpen(Date.parse(at))).toBe(expected);
  });
  it("rejects stale, future, and outside-window indicator data", () => {
    expect(()=>validatePulsePost(baseline,now+300001)).toThrow("Stale");
    expect(()=>validatePulsePost(baseline,now-5001)).toThrow("future");
    const early=Date.parse("2026-09-24T10:00:00Z");
    expect(()=>validatePulsePost(event({at:early}),early)).toThrow("Outside");
  });
  it("keeps supervised after-hours observations separate from indicator events", () => {
    const at=Date.parse("2026-09-24T10:00:00Z");
    const input=event({at,source:"chart-review",summary:"Below 5m supply.",chartUrl:"https://untrusted.example/image.png",capturedAt:123});
    expect(()=>validatePulsePost(input,at)).toThrow("Invalid chart review");
    const accepted=validatePulsePost(input,at,true);
    expect(accepted.afterHoursTest).toBe(true);
    expect(accepted.chartUrl).toBeUndefined();
    expect(accepted.capturedAt).toBeUndefined();
    expect(accepted.price).toBeUndefined();
    expect(accepted.lower).toBeUndefined();
    expect(accepted.upper).toBeUndefined();
  });
  it("accepts exact reviewed indicator labels only through the private review path", () => {
    const review=event({source:"chart-review",summary:"In 15m supply.",timeframe:15,lower:7656.7,upper:7664.1,levelsSource:"indicator-labels"});
    expect(()=>validatePulsePost(review,now)).toThrow("Invalid chart review");
    expect(validatePulsePost(review,now,true)).toMatchObject({lower:7656.7,upper:7664.1,levelsSource:"indicator-labels"});
    for (const invalid of [{lower:7665},{upper:NaN},{lower:undefined},{levelsSource:"estimated"}]) expect(()=>validatePulsePost({...review,...invalid},now,true)).toThrow("Invalid reviewed boundaries");
  });
  it("requires an actual inside price for entry and hold", () => {
    expect(()=>validatePulsePost(event({kind:"entered"}),now)).toThrow("Not inside");
    expect(()=>validatePulsePost(event({kind:"holding",price:7660}),now)).toThrow("Unconfirmed hold");
    expect(()=>validatePulsePost(event({kind:"exited",price:7660}),now)).toThrow("Still inside");
  });
  it("requires exact bounds and a confirmed price for a reviewed catch-up break",()=>{
    const review=event({source:"chart-review",kind:"broken",summary:"15m supply broke.",levelsSource:"indicator-labels",price:7665,confirmed:true});
    expect(validatePulsePost(review,now,true)).toMatchObject({kind:"broken",price:7665,confirmed:true});
    expect(()=>validatePulsePost({...review,confirmed:false},now,true)).toThrow("Unconfirmed reviewed break");
    expect(()=>validatePulsePost({...review,price:7650},now,true)).toThrow("Unconfirmed reviewed break");
  });
  it("only labels a break after a confirmed close beyond the correct boundary", () => {
    expect(()=>validatePulsePost(event({kind:"broken",price:7665}),now)).toThrow("Unconfirmed break");
    expect(()=>validatePulsePost(event({kind:"broken",price:7650,confirmed:true}),now)).toThrow("Unconfirmed break");
    expect(validatePulsePost(event({kind:"broken",price:7665,confirmed:true}),now).kind).toBe("broken");
  });
});
describe("SPX500 lifecycle", () => {
  const entry=event({id:"entry",kind:"entered",price:7660,at:now+1000});
  it("deduplicates webhook retries",()=>{const posts=[baseline,entry];expect(appendPulsePost(posts,entry)).toBe(posts);});
  it("requires baseline before entry",()=>expect(()=>appendPulsePost([],entry)).toThrow("baseline missing"));
  it("rejects out-of-order events and changed zone identity",()=>{
    expect(()=>appendPulsePost([baseline],{...entry,at:now-1})).toThrow("Out-of-order");
    expect(()=>appendPulsePost([baseline],{...entry,timeframe:15})).toThrow("identity changed");
  });
  it("silences repeat entries and same-candle holds",()=>{
    const posts=[baseline,entry];
    expect(appendPulsePost(posts,{...entry,id:"entry-2",at:now+2000})).toBe(posts);
    expect(appendPulsePost(posts,{...entry,id:"hold",kind:"holding",confirmed:true,at:now+3000})).toBe(posts);
    expect(appendPulsePost(posts,{...entry,id:"hold-2",kind:"holding",confirmed:true,at:now+301000})).toHaveLength(3);
  });
  it("does not reopen retired or broken zones",()=>{
    const broken={...entry,id:"broken",kind:"broken" as const,price:7666,confirmed:true,at:now+3000};
    expect(()=>appendPulsePost([baseline,entry,broken],{...entry,id:"late",at:now+4000})).toThrow("already closed");
  });
  it("requires entry before exit or hold",()=>expect(()=>appendPulsePost([baseline],{...entry,kind:"exited"})).toThrow("entry missing"));
});
