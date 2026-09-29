import { describe, expect, it } from "vitest";
import { zonePostCopy } from "../lib/zonePostCopy";
import type { BitcoinZonePost } from "../lib/bitcoinZones";
const event = {side:"demand",kind:"observed",timeframe:15} as BitcoinZonePost;
describe("beginner zone copy", () => {
  it("does not present a baseline as a newly formed zone", () => {
    expect(zonePostCopy(event).title).toBe("Zone on watch");
    expect(zonePostCopy(event).points).toHaveLength(3);
  });
  it("uses the correct supply boundary", () => {
    const copy = zonePostCopy({...event,side:"supply",timeframe:5});
    expect(copy.points[0]).toContain("5-minute");
    expect(copy.points[1]).toContain("upper");
  });
  it("explains timeframe and keeps risk examples educational", () => {
    const copy = zonePostCopy(event);
    expect(copy.explanation).toContain("Not an entry signal");
    expect(copy.points[1]).toContain("Stops can slip");
    expect(copy.points[2]).toContain("isn’t a guaranteed win");
    expect(copy.points.every(point => point.length < 100)).toBe(true);
  });
  it("does not imply an invalidated zone is an entry", () => {
    expect(zonePostCopy({...event,kind:"retired"}).points[0]).toContain("not a fresh entry");
  });
});
