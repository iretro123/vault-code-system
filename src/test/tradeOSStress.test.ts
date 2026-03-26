import { describe, it, expect } from "vitest";
import {
  computeVaultLimits,
  resolveViableRiskMode,
  MIN_VIABLE_CONTRACT,
  TARGET_CONTRACT,
  MAX_CONTRACT,
  MAX_LOSSES_PER_DAY,
  MIN_RISK_FLOOR,
  RISK_MODE_DAILY_PERCENT,
  getAccountTier,
} from "@/lib/vaultConstants";
import {
  detectTier,
  calculatePlan,
  validateInputs,
  TIER_DEFAULTS,
} from "@/lib/tradePlannerCalc";

// ─── 1. Risk Engine: Scaling across many account sizes ──────────────

describe("Risk Engine — Account Scaling Stress", () => {
  const sizes = [100, 250, 500, 1000, 2000, 3000, 4000, 5000, 7500, 10000, 15000, 25000, 50000, 75000, 100000, 250000, 500000];
  const modes = ["CONSERVATIVE", "STANDARD", "AGGRESSIVE"];

  for (const size of sizes) {
    for (const mode of modes) {
      it(`$${size.toLocaleString()} ${mode} → valid limits`, () => {
        const limits = computeVaultLimits(size, mode);

        // risk_per_trade must be at least MIN_VIABLE_CONTRACT (or MIN_RISK_FLOOR in survival)
        expect(limits.risk_per_trade).toBeGreaterThanOrEqual(MIN_VIABLE_CONTRACT);

        // max_contracts must be >= 1
        expect(limits.max_contracts).toBeGreaterThanOrEqual(1);

        // daily_loss_limit consistency
        if (limits.survival_mode) {
          expect(limits.daily_loss_limit).toBe(MIN_RISK_FLOOR);
          expect(limits.max_trades_per_day).toBe(1);
          expect(limits.max_contracts).toBe(1);
        } else {
          expect(limits.daily_loss_limit).toBe(limits.risk_per_trade * MAX_LOSSES_PER_DAY);
          expect(limits.max_trades_per_day).toBe(MAX_LOSSES_PER_DAY);
          expect(limits.max_contracts).toBe(Math.floor(limits.risk_per_trade / TARGET_CONTRACT));
        }

        // max_contracts should scale: bigger account + higher risk = more contracts
        // (verified implicitly by the formula check above)
      });
    }
  }
});

// ─── 2. Risk Engine: Monotonic scaling ──────────────────────────────

describe("Risk Engine — Monotonic Scaling", () => {
  for (const mode of ["CONSERVATIVE", "STANDARD", "AGGRESSIVE"]) {
    it(`${mode}: contracts never decrease as account grows`, () => {
      let prevContracts = 0;
      for (let bal = 500; bal <= 200000; bal += 500) {
        const limits = computeVaultLimits(bal, mode);
        expect(limits.max_contracts).toBeGreaterThanOrEqual(prevContracts);
        prevContracts = limits.max_contracts;
      }
    });

    it(`${mode}: risk_per_trade never decreases as account grows`, () => {
      let prevRisk = 0;
      for (let bal = 500; bal <= 200000; bal += 500) {
        const limits = computeVaultLimits(bal, mode);
        expect(limits.risk_per_trade).toBeGreaterThanOrEqual(prevRisk);
        prevRisk = limits.risk_per_trade;
      }
    });
  }
});

// ─── 3. Risk Mode Resolution ────────────────────────────────────────

describe("Risk Mode Resolution — Edge Cases", () => {
  it("AGGRESSIVE never gets overridden", () => {
    for (const bal of [100, 500, 1000, 5000, 50000]) {
      const resolved = resolveViableRiskMode(bal, "AGGRESSIVE");
      expect(resolved.applied_mode).toBe("AGGRESSIVE");
      expect(resolved.was_overridden).toBe(false);
    }
  });

  it("STANDARD never gets overridden", () => {
    for (const bal of [100, 500, 1000, 5000, 50000]) {
      const resolved = resolveViableRiskMode(bal, "STANDARD");
      expect(resolved.applied_mode).toBe("STANDARD");
      expect(resolved.was_overridden).toBe(false);
    }
  });

  it("CONSERVATIVE override boundary is exactly $4,000", () => {
    // At $4,000: raw_daily=40, raw_per_trade=20 = MIN_VIABLE → no override
    const at4000 = resolveViableRiskMode(4000, "CONSERVATIVE");
    expect(at4000.was_overridden).toBe(false);

    // At $3,999: raw_per_trade < 20 → override
    const at3999 = resolveViableRiskMode(3999, "CONSERVATIVE");
    expect(at3999.was_overridden).toBe(true);
  });

  it("resolved limits always match computeVaultLimits for applied mode", () => {
    for (const bal of [500, 2000, 4000, 10000, 50000]) {
      for (const mode of ["CONSERVATIVE", "STANDARD", "AGGRESSIVE"]) {
        const resolved = resolveViableRiskMode(bal, mode);
        const direct = computeVaultLimits(bal, resolved.applied_mode);
        expect(resolved.limits).toEqual(direct);
      }
    }
  });
});

// ─── 4. Survival Mode Boundaries ────────────────────────────────────

describe("Survival Mode Boundaries", () => {
  it("survival activates when raw_risk_per_trade < MIN_RISK_FLOOR", () => {
    // STANDARD at $1,999: raw_daily=39.98, raw_per_trade=19.99 < 20 → survival
    const limits = computeVaultLimits(1999, "STANDARD");
    expect(limits.survival_mode).toBe(true);
  });

  it("survival deactivates at exact boundary", () => {
    // STANDARD at $2,000: raw_daily=40, raw_per_trade=20 = MIN_RISK_FLOOR → NOT survival
    const limits = computeVaultLimits(2000, "STANDARD");
    expect(limits.survival_mode).toBe(false);
    expect(limits.risk_per_trade).toBe(20);
    expect(limits.max_contracts).toBe(1);
  });

  it("AGGRESSIVE exits survival earlier than STANDARD", () => {
    // AGGRESSIVE at $1,334: raw_daily=40.02, raw_per_trade=20.01 → not survival
    const aggressive = computeVaultLimits(1334, "AGGRESSIVE");
    expect(aggressive.survival_mode).toBe(false);

    // STANDARD at $1,334: raw_daily=26.68, raw_per_trade=13.34 → survival
    const standard = computeVaultLimits(1334, "STANDARD");
    expect(standard.survival_mode).toBe(true);
  });
});

// ─── 5. Specific Account Scenarios (Real User Cases) ────────────────

describe("Real User Scenarios", () => {
  it("$55,500 @ 3% → 27 contracts", () => {
    const limits = computeVaultLimits(55500, "AGGRESSIVE");
    expect(limits.max_contracts).toBe(27);
    expect(limits.risk_per_trade).toBe(832.5);
  });

  it("$55,500 @ 1% → 9 contracts", () => {
    const limits = computeVaultLimits(55500, "CONSERVATIVE");
    expect(limits.max_contracts).toBe(9); // floor(277.5/30)=9
    expect(limits.risk_per_trade).toBe(277.5);
  });

  it("$55,500 @ 2% → 18 contracts", () => {
    const limits = computeVaultLimits(55500, "STANDARD");
    expect(limits.max_contracts).toBe(18); // floor(555/30)=18
    expect(limits.risk_per_trade).toBe(555);
  });

  it("$5,000 @ 2% → 1 contract", () => {
    const limits = computeVaultLimits(5000, "STANDARD");
    expect(limits.max_contracts).toBe(1); // floor(50/30)=1
    expect(limits.risk_per_trade).toBe(50);
  });

  it("$10,000 @ 2% → 3 contracts", () => {
    const limits = computeVaultLimits(10000, "STANDARD");
    expect(limits.max_contracts).toBe(3); // floor(100/30)=3
    expect(limits.risk_per_trade).toBe(100);
  });

  it("$500 @ any mode → survival, 1 contract", () => {
    for (const mode of ["CONSERVATIVE", "STANDARD", "AGGRESSIVE"]) {
      const resolved = resolveViableRiskMode(500, mode);
      expect(resolved.limits.max_contracts).toBe(1);
      expect(resolved.limits.survival_mode).toBe(
        mode === "AGGRESSIVE" ? false : true
      );
    }
  });
});

// ─── 6. Trade Planner Consistency ───────────────────────────────────

describe("Trade Planner — Validation", () => {
  it("rejects stop >= entry", () => {
    const errors = validateInputs({
      accountSize: 10000, riskPercent: 2, preferredSpendPercent: 5,
      hardMaxSpendPercent: 10, direction: "Long Call",
      entryPremium: 1.50, stopPremium: 1.50,
    });
    expect(errors.some(e => e.field === "stopPremium")).toBe(true);
  });

  it("rejects negative account", () => {
    const errors = validateInputs({
      accountSize: -100, riskPercent: 2, preferredSpendPercent: 5,
      hardMaxSpendPercent: 10, direction: "Long Call",
      entryPremium: 1.50, stopPremium: 1.00,
    });
    expect(errors.some(e => e.field === "accountSize")).toBe(true);
  });

  it("rejects zero entry premium", () => {
    const errors = validateInputs({
      accountSize: 10000, riskPercent: 2, preferredSpendPercent: 5,
      hardMaxSpendPercent: 10, direction: "Long Call",
      entryPremium: 0, stopPremium: 0,
    });
    expect(errors.some(e => e.field === "entryPremium")).toBe(true);
  });
});

describe("Trade Planner — Calculation Consistency", () => {
  it("$10,000 account, $1.50 entry, $1.00 stop → safe trade", () => {
    const result = calculatePlan({
      accountSize: 10000, riskPercent: 2, preferredSpendPercent: 5,
      hardMaxSpendPercent: 10, direction: "Long Call",
      entryPremium: 1.50, stopPremium: 1.00,
    });
    // riskBudget = 200, plannedRiskPerContract = 50
    expect(result.riskBudget).toBe(200);
    expect(result.plannedRiskPerContract).toBe(50);
    expect(result.contractsByRisk).toBe(4);
    expect(result.totalPlannedRisk).toBeLessThanOrEqual(result.riskBudget);
    expect(result.verdict).not.toBe("NO_TRADE");
  });

  it("profit targets are correct R-multiples", () => {
    const result = calculatePlan({
      accountSize: 10000, riskPercent: 2, preferredSpendPercent: 5,
      hardMaxSpendPercent: 10, direction: "Long Call",
      entryPremium: 2.00, stopPremium: 1.50,
    });
    const r = 0.50;
    expect(result.tp1Premium).toBeCloseTo(2.00 + r);     // 1:1
    expect(result.mainTarget).toBeCloseTo(2.00 + 2 * r);  // 1:2
    expect(result.tp2Premium).toBeCloseTo(2.00 + 3 * r);  // 1:3
  });

  it("expensive premium → NO_TRADE", () => {
    const result = calculatePlan({
      accountSize: 1000, riskPercent: 1, preferredSpendPercent: 5,
      hardMaxSpendPercent: 10, direction: "Long Call",
      entryPremium: 15.00, stopPremium: 10.00,
    });
    // riskBudget = 10, plannedRiskPerContract = 500, contractsByRisk = 0
    expect(result.verdict).toBe("NO_TRADE");
    expect(result.finalContracts).toBe(0);
  });
});

// ─── 7. Edge: Zero & Negative Balances ──────────────────────────────

describe("Edge Cases — Zero & Extreme Balances", () => {
  it("$0 balance → survival mode, safe defaults", () => {
    const limits = computeVaultLimits(0, "STANDARD");
    expect(limits.survival_mode).toBe(true);
    expect(limits.max_contracts).toBe(1);
    expect(limits.risk_per_trade).toBe(MIN_RISK_FLOOR);
  });

  it("negative balance → survival mode", () => {
    const limits = computeVaultLimits(-500, "STANDARD");
    expect(limits.survival_mode).toBe(true);
    expect(limits.max_contracts).toBe(1);
  });

  it("$1M balance @ AGGRESSIVE → many contracts, no crash", () => {
    const limits = computeVaultLimits(1000000, "AGGRESSIVE");
    // 1M * 0.03 / 2 = 15000 risk_per_trade, floor(15000/30) = 500
    expect(limits.max_contracts).toBe(500);
    expect(limits.survival_mode).toBe(false);
  });

  it("unknown risk mode falls back to STANDARD", () => {
    const limits = computeVaultLimits(10000, "UNKNOWN_MODE");
    const standard = computeVaultLimits(10000, "STANDARD");
    expect(limits).toEqual(standard);
  });
});

// ─── 8. Tier Detection Consistency ──────────────────────────────────

describe("Tier Detection", () => {
  it("vaultConstants tiers match tradePlannerCalc tiers at boundaries", () => {
    expect(getAccountTier(999)).toBe("MICRO");
    expect(getAccountTier(2000)).toBe("SMALL");
    expect(getAccountTier(10001)).toBe("STANDARD");

    expect(detectTier(999)).toBe("Micro");
    expect(detectTier(1000)).toBe("Small");
    expect(detectTier(5000)).toBe("Medium");
    expect(detectTier(25000)).toBe("Large");
  });
});
