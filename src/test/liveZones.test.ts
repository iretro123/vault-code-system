import { describe, expect, it } from "vitest";
import { applyZoneEvent, isRegularWindow, parseZoneEvent, zoneUpdateCopy, ZONE_FIXTURE } from "../lib/liveZones";

describe("isolated Live Zones prototype", () => {
  it("describes a broken zone without presenting it as an entry", () => {
    const copy = zoneUpdateCopy({...ZONE_FIXTURE, kind: "invalidated"});
    expect(copy.title).toBe("Zone broken · Be careful");
    expect(copy.description).toContain("no longer active");
  });
  it("distinguishes entering from a confirmed bounce", () => {
    expect(zoneUpdateCopy({...ZONE_FIXTURE, kind: "entered"}).description).toContain("does not confirm");
  });
  it.each(["2026-09-18T13:29:59Z", "2026-09-18T20:00:00Z", "2026-09-19T14:00:00Z", "bad-date"])("rejects outside window %s", at => expect(isRegularWindow(at)).toBe(false));
  it.each(["2026-09-18T13:30:00Z", "2026-09-18T19:59:59Z", "2026-01-20T14:30:00Z"])("handles Eastern daylight/standard time %s", at => expect(isRegularWindow(at)).toBe(true));
  it("does not pretend to be a holiday calendar", () => expect(isRegularWindow("2026-12-25T15:00:00Z")).toBe(true));
  it.each([{symbol:"TSLA"}, {timeframe:1}, {lower:502}, {price:NaN}, {session:"extended"}, {trend:"safe"}, {at:"2026-09-18T14:00:00"}])("rejects malformed or out of scope event %j", patch => expect(() => parseZoneEvent({...ZONE_FIXTURE,...patch})).toThrow());
  it("creates once and ignores repeated webhook ids", () => {
    const zones = applyZoneEvent([], ZONE_FIXTURE);
    expect(zones).toHaveLength(1);
    expect(applyZoneEvent(zones, ZONE_FIXTURE)).toBe(zones);
  });
  it("requires a known zone before entry", () => expect(() => applyZoneEvent([], {...ZONE_FIXTURE,kind:"entered",price:500.5})).toThrow());
  it("tracks entry, exit, reentry and invalidation without resurrecting the zone", () => {
    let zones = applyZoneEvent([], ZONE_FIXTURE);
    const send = (kind:string,id:string,price:number) => {zones = applyZoneEvent(zones, {...ZONE_FIXTURE,kind,id,price,at:"2026-09-18T14:05:00Z"});};
    send("entered","entry1",500.5);
    expect(zones[0].status).toBe("inside");
    send("entered","entry-repeat",500.6);
    expect(zones[0].history).toHaveLength(2);
    send("exited","exit1",502);
    expect(zones[0].status).toBe("active");
    send("entered","entry2",500.7);
    expect(zones[0].history).toHaveLength(4);
    send("invalidated","invalid",499);
    send("entered","late",500.5);
    expect(zones[0].status).toBe("invalidated");
    expect(zones[0].history).toHaveLength(5);
  });
  it("rejects entry outside bounds and identity mutation", () => {
    const zones = applyZoneEvent([], ZONE_FIXTURE);
    expect(() => applyZoneEvent(zones,{...ZONE_FIXTURE,id:"touch",kind:"entered",price:503})).toThrow();
    expect(() => applyZoneEvent(zones,{...ZONE_FIXTURE,id:"other",symbol:"QQQ"})).toThrow();
  });
  it("ignores older updates", () => {
    const zones = applyZoneEvent([], ZONE_FIXTURE);
    expect(applyZoneEvent(zones,{...ZONE_FIXTURE,id:"old",kind:"invalidated",at:"2026-09-18T13:45:00Z"})).toBe(zones);
  });
});
