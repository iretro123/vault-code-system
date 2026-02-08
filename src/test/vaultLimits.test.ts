import { describe, it, expect } from "vitest";
import {
  computeVaultLimits,
  resolveViableRiskMode,
  MIN_VIABLE_CONTRACT,
  TARGET_CONTRACT,
  MAX_CONTRACT,
  MAX_LOSSES_PER_DAY,
} from "@/lib/vaultConstants";

describe("computeVaultLimits", () => {
  it("$500 STANDARD → 1 contract, 2 trades, clamped to TARGET", () => {
    const limits = computeVaultLimits(500, "STANDARD");
    // raw_daily = 500*0.02=10, raw_per_trade=5, clamped to max(5,30)=30, min(30,50)=30
    expect(limits.risk_per_trade).toBe(30);
    expect(limits.daily_loss_limit).toBe(60);
    expect(limits.max_trades_per_day).toBe(2);
    expect(limits.max_contracts).toBe(1);
  });

  it("$500 CONSERVATIVE → overridden to STANDARD via resolveViableRiskMode", () => {
    const resolved = resolveViableRiskMode(500, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(true);
    expect(resolved.applied_mode).toBe("STANDARD");
    expect(resolved.limits.risk_per_trade).toBe(30);
    expect(resolved.limits.max_contracts).toBe(1);
    expect(resolved.limits.max_trades_per_day).toBe(2);
  });

  it("$1,500 CONSERVATIVE → overridden, same as $500", () => {
    // raw_daily = 1500*0.01=15, raw_per_trade=7.5 < 20 → override to STANDARD
    const resolved = resolveViableRiskMode(1500, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(true);
    expect(resolved.applied_mode).toBe("STANDARD");
    // STANDARD: raw_daily=1500*0.02=30, raw_per_trade=15, clamped to 30
    expect(resolved.limits.risk_per_trade).toBe(30);
    expect(resolved.limits.max_contracts).toBe(1);
    expect(resolved.limits.max_trades_per_day).toBe(2);
  });

  it("$2,500 CONSERVATIVE → smooth transition, still clamped", () => {
    // raw_daily = 2500*0.01=25, raw_per_trade=12.5 < 20 → override
    const resolved = resolveViableRiskMode(2500, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(true);
    // STANDARD: raw_daily=2500*0.02=50, raw_per_trade=25, clamped to max(25,30)=30
    expect(resolved.limits.risk_per_trade).toBe(30);
    expect(resolved.limits.daily_loss_limit).toBe(60);
    expect(resolved.limits.max_contracts).toBe(1);
  });

  it("$12,000 CONSERVATIVE → correct dollar math, hits MAX_CONTRACT", () => {
    // raw_daily = 12000*0.01=120, raw_per_trade=60, clamped to min(60,50)=50
    const resolved = resolveViableRiskMode(12000, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(false);
    expect(resolved.applied_mode).toBe("CONSERVATIVE");
    expect(resolved.limits.risk_per_trade).toBe(50);
    expect(resolved.limits.daily_loss_limit).toBe(100);
    expect(resolved.limits.max_trades_per_day).toBe(2);
    expect(resolved.limits.max_contracts).toBe(1); // floor(50/30) = 1
  });

  it("$12,000 STANDARD → higher risk bracket", () => {
    // raw_daily = 12000*0.02=240, raw_per_trade=120, clamped to min(120,50)=50
    const limits = computeVaultLimits(12000, "STANDARD");
    expect(limits.risk_per_trade).toBe(50);
    expect(limits.daily_loss_limit).toBe(100);
    expect(limits.max_contracts).toBe(1);
  });

  it("constants are correct", () => {
    expect(MIN_VIABLE_CONTRACT).toBe(20);
    expect(TARGET_CONTRACT).toBe(30);
    expect(MAX_CONTRACT).toBe(50);
    expect(MAX_LOSSES_PER_DAY).toBe(2);
  });

  it("$4,000 CONSERVATIVE → viable, no override", () => {
    // raw_daily = 4000*0.01=40, raw_per_trade=20 = MIN_VIABLE → no override
    const resolved = resolveViableRiskMode(4000, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(false);
    expect(resolved.limits.risk_per_trade).toBe(30); // max(20,30)=30
  });

  it("$3,999 CONSERVATIVE → override (raw_per_trade < 20)", () => {
    // raw_daily = 3999*0.01=39.99, raw_per_trade=19.995 < 20 → override
    const resolved = resolveViableRiskMode(3999, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(true);
    expect(resolved.applied_mode).toBe("STANDARD");
  });
});
