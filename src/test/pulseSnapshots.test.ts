import { describe, it, expect } from "vitest";
import { postsFromSnapshot, validatePulseSnapshot, type PulseSnapshot } from "@/lib/pulseSnapshots";
import { pulseHeadline, type PulsePost } from "@/lib/spxPulse";
const barAt = Date.parse("2026-09-24T14:00:00Z");
const zone = { zoneId: "SPX500:15:supply:1", side: "supply" as const, lower: 7656.7, upper: 7664.1 };
function state(price: number, offset = 1000, options: Partial<PulseSnapshot> = {}): PulseSnapshot {
  const currentBar = options.barAt ?? barAt;
  return {kind:"snapshot",source:"indicator",symbol:"CAPITALCOM:SPX500",timeframe:15,at:barAt+offset,barAt:currentBar,price,confirmed:false,zones:[zone],bars:[{t:currentBar-900000,o:7660,h:7662,l:7656,c:7659},{t:currentBar,o:7659,h:Math.max(7663,price),l:Math.min(7655,price),c:price}],...options};
}
const run = (posts: PulsePost[], s: PulseSnapshot) => postsFromSnapshot(posts,validatePulseSnapshot(s,s.at),s.at);
describe("automatic indicator updates",()=>{
  it("posts a baseline once and stays quiet while nothing changes",()=>{
    const start=run([],state(7660));
    expect(pulseHeadline(start[0])).toBe("In 15m supply.");
    expect(run(start,state(7661,20000))).toBe(start);
  });
  it("warns on a price crossing, retains the missing zone, then confirms a close",()=>{
    const baseline=run([],state(7660));
    const breach=run(baseline,state(7665,20000,{zones:[]}));
    expect(breach.at(-1)?.kind).toBe("breached");
    expect(run(breach,state(7666,40000,{zones:[]}))).toBe(breach);
    const closed=run(breach,state(7665,899999,{confirmed:true,zones:[]}));
    expect(closed.at(-1)?.kind).toBe("broken");
    expect(pulseHeadline(closed.at(-1)!)).toBe("15m supply broke. Closed above 7,664.1.");
    expect(run(closed,state(7666,900000,{confirmed:true,zones:[]}))).toBe(closed);
  });
  it("does not call a temporary push above the zone a confirmed break",()=>{
    const baseline=run([],state(7660));
    const breach=run(baseline,state(7665,20000,{zones:[]}));
    const returned=run(breach,state(7660,40000));
    expect(returned.at(-1)?.kind).toBe("returned");
    expect(returned.some(p=>p.kind==="broken")).toBe(false);
  });
  it("detects a break from a closed candle if its closing delivery was missed",()=>{
    const baseline=run([],state(7660));
    const next=state(7660,901000,{barAt:barAt+900000});
    next.bars[0]={t:barAt,o:7659,h:7667,l:7658,c:7666};
    const posts=run(baseline,next);
    expect(posts.at(-1)).toMatchObject({kind:"broken",price:7666,confirmed:true,barAt});
  });
  it("labels zone removal separately when the candle did not break it",()=>{
    const baseline=run([],state(7660));
    expect(run(baseline,state(7660,20000,{zones:[]}))).toBe(baseline);
    const removed=run(baseline,state(7660,899999,{zones:[],confirmed:true}));
    expect(removed.at(-1)?.kind).toBe("retired");
    expect(pulseHeadline(removed.at(-1)!)).toContain("removed from the chart");
  });
  it("catches up a break after an hour offline and announces a replacement zone",()=>{
    const baseline=run([],state(7660));
    const replacement={...zone,zoneId:"SPX500:15:supply:2",lower:7680,upper:7690};
    const recovered=state(7672,3601000,{barAt:barAt+3600000,zones:[replacement]});
    recovered.bars=[
      {t:barAt,o:7659,h:7667,l:7658,c:7666},
      ...[1,2,3,4].map(i=>({t:barAt+i*900000,o:7666,h:7675,l:7665,c:7672})),
    ];
    const posts=run(baseline,recovered);
    expect(posts.slice(1)).toMatchObject([
      {zoneId:zone.zoneId,kind:"broken",price:7666,closedAt:barAt+900000},
      {zoneId:replacement.zoneId,kind:"observed",lower:7680,upper:7690},
    ]);
    expect(posts[1].bars?.at(-1)?.t).toBe(barAt);
    expect(run(posts,{...recovered,at:recovered.at+20000})).toBe(posts);
  });
  it("handles demand breaks in the opposite direction",()=>{
    const demand={...zone,side:"demand" as const,zoneId:"demand:1"};
    const start=run([],state(7660,1000,{zones:[demand]}));
    const closed=run(start,state(7655,899999,{zones:[],confirmed:true}));
    expect(closed.at(-1)?.kind).toBe("broken");
    expect(pulseHeadline(closed.at(-1)!)).toContain("Closed below 7,656.7");
  });
  it("posts entries and exits only when their state changes",()=>{
    const start=run([],state(7655));
    const entered=run(start,state(7660,20000));
    expect(entered.at(-1)?.kind).toBe("entered");
    const exited=run(entered,state(7655,40000));
    expect(exited.at(-1)?.kind).toBe("exited");
    expect(run(exited,state(7654,60000))).toBe(exited);
  });
  it("rejects changed bounds on the same zone identity",()=>{
    const start=run([],state(7660));
    expect(()=>run(start,state(7660,20000,{zones:[{...zone,upper:7665}]}))).toThrow("identity changed");
  });
  it("retains candle data for accurate chart rendering",()=>{
    const s=state(7660);expect(run([],s)[0].bars).toEqual(s.bars);
  });
});
describe("source integrity",()=>{
  it("accepts the final 4 PM candle close while rejecting after-session open bars",()=>{
    const close=Date.parse("2026-09-24T20:00:00Z");
    const s=state(7665,1000,{barAt:close-900000,at:close,confirmed:true});
    s.bars=s.bars.map((b,i)=>({...b,t:close+(i-2)*900000}));
    const checked=validatePulseSnapshot(s,close+1000);
    expect(postsFromSnapshot([],checked,close+1000)[0].afterHoursTest).toBeUndefined();
    expect(()=>validatePulseSnapshot({...s,confirmed:false},close+1000)).toThrow("Outside");
    expect(()=>validatePulseSnapshot(s,close+60001)).toThrow("Stale");
  });
  it("rejects stale, wrong-symbol, inconsistent and prematurely closed candles",()=>{
    const s=state(7660);
    expect(()=>validatePulseSnapshot(s,s.at+60001)).toThrow("Stale");
    expect(()=>validatePulseSnapshot({...s,symbol:"SPY"},s.at)).toThrow("Wrong chart");
    expect(()=>validatePulseSnapshot({...s,price:7661},s.at)).toThrow("mismatch");
    expect(()=>validatePulseSnapshot({...s,confirmed:true},s.at)).toThrow("still open");
    expect(()=>validatePulseSnapshot({...s,bars:[...s.bars].reverse()},s.at)).toThrow("candle");
  });
  it("keeps after-hours delivery behind an explicit local test setting",()=>{
    const early=Date.parse("2026-09-24T10:00:00Z");const s=state(7660,1000,{barAt:early,at:early+1000});
    s.bars=s.bars.map((b,i)=>({...b,t:early+(i-1)*900000}));
    expect(()=>validatePulseSnapshot(s,s.at)).toThrow("Outside");
    const checked=validatePulseSnapshot(s,s.at,true);
    expect(postsFromSnapshot([],checked,s.at,true)[0].afterHoursTest).toBe(true);
  });
});
