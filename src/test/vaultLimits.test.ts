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
  it("$500 STANDARD → survival mode (raw_per_trade < MIN_RISK_FLOOR)", () => {
    const limits = computeVaultLimits(500, "STANDARD");
    // raw_daily = 500*0.02=10, raw_per_trade=5, < MIN_RISK_FLOOR(20) → survival
    expect(limits.risk_per_trade).toBe(20);
    expect(limits.daily_loss_limit).toBe(20);
    expect(limits.max_trades_per_day).toBe(1);
    expect(limits.max_contracts).toBe(1);
    expect(limits.survival_mode).toBe(true);
  });

  it("$500 CONSERVATIVE → overridden to STANDARD, still survival mode", () => {
    const resolved = resolveViableRiskMode(500, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(true);
    expect(resolved.applied_mode).toBe("STANDARD");
    expect(resolved.limits.risk_per_trade).toBe(20);
    expect(resolved.limits.max_contracts).toBe(1);
    expect(resolved.limits.max_trades_per_day).toBe(1);
  });

  it("$1,500 CONSERVATIVE → overridden to STANDARD, survival mode", () => {
    const resolved = resolveViableRiskMode(1500, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(true);
    expect(resolved.applied_mode).toBe("STANDARD");
    expect(resolved.limits.risk_per_trade).toBe(20);
    expect(resolved.limits.max_contracts).toBe(1);
    expect(resolved.limits.max_trades_per_day).toBe(1);
  });

  it("$2,500 CONSERVATIVE → override to STANDARD, scales with balance", () => {
    const resolved = resolveViableRiskMode(2500, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(true);
    // STANDARD: raw_daily=2500*0.02=50, raw_per_trade=25, max(25,20)=25
    expect(resolved.limits.risk_per_trade).toBe(25);
    expect(resolved.limits.daily_loss_limit).toBe(50);
    expect(resolved.limits.max_contracts).toBe(1);
  });

  it("$12,000 CONSERVATIVE → scales naturally, no cap", () => {
    // raw_daily = 12000*0.01=120, raw_per_trade=60, max(60,20)=60
    const resolved = resolveViableRiskMode(12000, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(false);
    expect(resolved.applied_mode).toBe("CONSERVATIVE");
    expect(resolved.limits.risk_per_trade).toBe(60);
    expect(resolved.limits.daily_loss_limit).toBe(120);
    expect(resolved.limits.max_trades_per_day).toBe(2);
    expect(resolved.limits.max_contracts).toBe(2); // floor(60/30) = 2
  });

  it("$12,000 STANDARD → higher risk bracket, more contracts", () => {
    // raw_daily = 12000*0.02=240, raw_per_trade=120, max(120,20)=120
    const limits = computeVaultLimits(12000, "STANDARD");
    expect(limits.risk_per_trade).toBe(120);
    expect(limits.daily_loss_limit).toBe(240);
    expect(limits.max_contracts).toBe(4); // floor(120/30) = 4
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
    expect(resolved.limits.risk_per_trade).toBe(20); // max(20,20) = 20
  });

  it("$3,999 CONSERVATIVE → override (raw_per_trade < 20)", () => {
    const resolved = resolveViableRiskMode(3999, "CONSERVATIVE");
    expect(resolved.was_overridden).toBe(true);
    expect(resolved.applied_mode).toBe("STANDARD");
  });

  it("$55,500 AGGRESSIVE → 27 contracts", () => {
    // raw_daily = 55500*0.03=1665, raw_per_trade=832.5, floor(832.5/30) = 27
    const limits = computeVaultLimits(55500, "AGGRESSIVE");
    expect(limits.risk_per_trade).toBe(832.5);
    expect(limits.daily_loss_limit).toBe(1665);
    expect(limits.max_contracts).toBe(27);
    expect(limits.survival_mode).toBe(false);
  });

  it("$25,000 STANDARD → 8 contracts", () => {
    // raw_daily = 25000*0.02=500, raw_per_trade=250, floor(250/30) = 8
    const limits = computeVaultLimits(25000, "STANDARD");
    expect(limits.risk_per_trade).toBe(250);
    expect(limits.max_contracts).toBe(8);
  });
});
