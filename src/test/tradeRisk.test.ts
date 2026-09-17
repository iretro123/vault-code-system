import { describe, expect, it } from "vitest";
import { blankPlan, calculateRisk, examplePlan, FUTURES, type Plan } from "@/lib/tradeRisk";

describe("TradeOS risk calculations", () => {
  it("does not size blank or invalid inputs", () => {
    for (const m of ["options", "futures", "forex"] as const) {
      expect(calculateRisk(m, blankPlan()).quantity).toBe(0);
      for (const balance of ["", "NaN", "Infinity", "-1"]) expect(calculateRisk(m, {...examplePlan(m), balance}).errors.length).toBeGreaterThan(0);
    }
  });
  it("uses full premium plus round-trip fees by default", () => {
    const r = calculateRisk("options", examplePlan("options"));
    expect(r.errors).toEqual([]); expect(r.budget).toBe(50); expect(r.unitRisk).toBe(42); expect(r.quantity).toBe(1); expect(r.fullPremium).toBe(42);
  });
  it("distinguishes the option stop estimate from entire premium loss", () => {
    const r = calculateRisk("options", {...examplePlan("options"), optionBasis:"stop"});
    expect(r.unitRisk).toBeCloseTo(20); expect(r.quantity).toBe(2); expect(r.fullPremium).toBe(84); expect(r.planned).toBeCloseTo(40);
  });
  it("rejects invalid long-option stops and negative allowances", () => {
    for (const stop of ["0.40", "0.8", "-1"]) expect(calculateRisk("options", {...examplePlan("options"), optionBasis:"stop", stop}).quantity).toBe(0);
    expect(calculateRisk("options", {...examplePlan("options"), optionBasis:"stop", allowance:"-0.1"}).errors.length).toBeGreaterThan(0);
  });
  it("caps an option's modeled loss at full premium even for extreme slippage", () => {
    expect(calculateRisk("options", {...examplePlan("options"), optionBasis:"stop", allowance:"5"}).unitRisk).toBe(42);
  });
  it("never sizes more options than settled cash or premium cap supports", () => {
    expect(calculateRisk("options", {...examplePlan("options"), cash:"41"}).quantity).toBe(0);
    expect(calculateRisk("options", {...examplePlan("options"), premiumCap:"41"}).quantity).toBe(0);
  });
  it("profits do not replenish the gross-loss daily budget", () => {
    const r = calculateRisk("options", {...examplePlan("options"), lost:"80", reserved:"10"});
    expect(r.remaining).toBe(10); expect(r.budget).toBe(10); expect(r.quantity).toBe(0);
  });
  it("stops at the dollar or losing-trade limit", () => {
    for (const patch of [{lost:"100"}, {losses:"2"}, {reserved:"100"}]) expect(calculateRisk("futures", {...examplePlan("futures"), ...patch}).quantity).toBe(0);
  });
  it("caps the daily budget at available capital", () => {
    expect(calculateRisk("options", {...examplePlan("options"), balance:"20"}).daily).toBe(20);
  });
  it("validates loss counts and percentage bounds", () => {
    for (const patch of [{percent:"101"},{maxLosses:"0"},{maxLosses:"1.5"},{losses:"-1"}]) expect(calculateRisk("futures", {...examplePlan("futures"), ...patch}).errors.length).toBeGreaterThan(0);
  });
  it("uses CME ticks and rounds the stop up", () => {
    for (const [symbol, spec] of Object.entries(FUTURES)) {
      const r = calculateRisk("futures", {...examplePlan("futures"), future:symbol as Plan["future"], distance:"1.01"});
      expect(r.ticks).toBe(5); expect(r.unitRisk).toBe(6*spec.value+2);
    }
  });
  it("subtracts margin and fee capacity; rejects fractional slippage ticks", () => {
    expect(calculateRisk("futures", {...examplePlan("futures"), freeMargin:"101"}).quantity).toBe(0);
    expect(calculateRisk("futures", {...examplePlan("futures"), allowance:"0.5"}).errors.length).toBeGreaterThan(0);
  });
  it("uses prop cushion, not the nominal account size", () => {
    const r = calculateRisk("futures", examplePlan("futures",true));
    expect(r.basis).toBe(1500); expect(r.budget).toBe(50); expect(r.quantity).toBe(1);
  });
  it("supports negative prop account balances with a lower floor", () => {
    const r = calculateRisk("futures", {...examplePlan("futures",true), balance:"-100",floor:"-2000"});
    expect(r.errors).toEqual([]); expect(r.basis).toBe(1400);
  });
  it("does not trade into a prop buffer or exhausted firm room", () => {
    for (const patch of [{floor:"49900"}, {firmRoom:"0"}, {firmCap:"0"}]) expect(calculateRisk("futures", {...examplePlan("futures",true), ...patch}).quantity).toBe(0);
  });
  it("counts additional open risk against remaining prop room", () => {
    const r=calculateRisk("futures", {...examplePlan("futures",true), firmRoom:"40",reserved:"20"});
    expect(r.remaining).toBe(20); expect(r.quantity).toBe(0);
  });
  it("gets forex pip value, lot rounding and fees right", () => {
    const r=calculateRisk("forex",examplePlan("forex"));
    expect(r.pipValue).toBe(10); expect(r.unitRisk).toBe(217); expect(r.quantity).toBe(0.23); expect(r.planned).toBeCloseTo(49.91);
  });
  it("converts JPY-quoted and non-USD cross pairs", () => {
    expect(calculateRisk("forex", {...examplePlan("forex"),pair:"USD/JPY",conversion:"0.0066666666667"}).pipValue).toBeCloseTo(6.6666666667);
    expect(calculateRisk("forex", {...examplePlan("forex"),pair:"EUR/GBP",conversion:"1.25"}).pipValue).toBe(12.5);
    expect(calculateRisk("forex", {...examplePlan("forex"),pair:"EUR/JPY",conversion:""}).quantity).toBe(0);
  });
  it("enforces broker lot minimum, step and free margin", () => {
    expect(calculateRisk("forex", {...examplePlan("forex"),minLot:"1"}).quantity).toBe(0);
    expect(calculateRisk("forex", {...examplePlan("forex"),lotStep:"0.1"}).quantity).toBe(0.2);
    expect(calculateRisk("forex", {...examplePlan("forex"),freeMargin:"401"}).quantity).toBe(0.1);
    expect(calculateRisk("forex", {...examplePlan("forex"),lotStep:"0"}).quantity).toBe(0);
  });
  it("never exceeds modeled risk budget over many stop distances", () => {
    for (const market of ["options","futures","forex"] as const) for (let i=1;i<100;i++) {
      const p={...examplePlan(market),percent:String(i/20),distance:String(i/3), entry:String(i/100)};
      const r=calculateRisk(market,p);
      expect(r.errors).toEqual([]); expect(r.planned).toBeLessThanOrEqual(r.budget+1e-8);
      expect(r.quantity).toBeGreaterThanOrEqual(0);
    }
  });
});
