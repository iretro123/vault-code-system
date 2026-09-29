import { describe, expect, it } from "vitest";
import { zoneMonitorStatus } from "../lib/zoneMonitor";
describe("honest observer status", () => {
  it("requires a recent actual check", () => {
    expect(zoneMonitorStatus(undefined, 500000)).toBe("unverified");
    expect(zoneMonitorStatus({lastCheckedAt:499000,blocked:false},500000)).toBe("fresh");
    expect(zoneMonitorStatus({lastCheckedAt:100000,blocked:false},500000)).toBe("stale");
  });
  it("never pulses when blocked or timestamp is in the future", () => {
    expect(zoneMonitorStatus({lastCheckedAt:499000,blocked:true},500000)).toBe("paused");
    expect(zoneMonitorStatus({lastCheckedAt:600000,blocked:false},500000)).toBe("stale");
  });
});
