import { describe, it, expect } from "vitest";
import {
  calculateContractChoices,
  buildChoice,
  formatCurrency,
  type ContractChoice,
} from "@/lib/vaultApprovalCalc";
import { detectTier, TIER_DEFAULTS } from "@/lib/tradePlannerCalc";

// ─── Contract Choice Calculations ───

describe("calculateContractChoices", () => {
  it("$2,000 account, $0.50 entry — 1-2 fits, recommended exists", () => {
    const result = calculateContractChoices(2000, 0.5);
    expect(result.choices).toHaveLength(4);
    expect(result.allPass).toBe(false);

    const c1 = result.choices[0];
    expect(c1.contracts).toBe(1);
    expect(c1.cashNeeded).toBe(50);
    expect(c1.status).toBe("fits");

    const c2 = result.choices[1];
    expect(c2.contracts).toBe(2);
    expect(c2.cashNeeded).toBe(100);
    expect(["fits", "tight"]).toContain(c2.status);

    const recommended = result.choices.filter((c) => c.isRecommended);
    expect(recommended).toHaveLength(1);
  });

  it("$5,000 account, $1.50 entry — verifies exact precision math", () => {
    const result = calculateContractChoices(5000, 1.5);
    expect(result.accountLevel).toBe("Medium");
    expect(result.riskBudget).toBe(50); // 5000 * 0.01

    const c1 = result.choices[0];
    expect(c1.cashNeeded).toBe(150); // 1.50 * 100 * 1
    // maxCutRoom = 50 / 100 = 0.50
    expect(c1.maxCutRoom).toBe(0.5);
    expect(c1.fullPremiumRiskOk).toBe(false);
    // exitPrice = 1.50 - 0.50 = 1.00 (exact, no rounding)
    expect(c1.exitPrice).toBe(1.0);
    // riskPerContract = 1.50 - 1.00 = 0.50
    expect(c1.riskPerContract).toBe(0.5);
    // totalRisk = 0.50 * 100 * 1 = 50
    expect(c1.totalRisk).toBe(50);
    // Targets from exact risk
    expect(c1.tp1).toBe(2.0);  // 1.50 + 0.50
    expect(c1.tp2).toBe(2.5);  // 1.50 + 1.00
    expect(c1.tp3).toBe(3.0);  // 1.50 + 1.50
  });

  it("$500 account, $3.00 entry — all pass (too expensive)", () => {
    const result = calculateContractChoices(500, 3.0);
    expect(result.allPass).toBe(true);
    result.choices.forEach((c) => {
      expect(c.status).toBe("pass");
      expect(c.coachingNote).toBe("Too expensive for this account.");
    });
  });

  it("exactly one choice is recommended when not all pass", () => {
    const result = calculateContractChoices(3000, 0.3);
    expect(result.allPass).toBe(false);
    const rec = result.choices.filter((c) => c.isRecommended);
    expect(rec).toHaveLength(1);
  });

  it("full premium risk detected for cheap options on large accounts", () => {
    const result = calculateContractChoices(10000, 0.1);
    const c1 = result.choices[0];
    expect(c1.fullPremiumRiskOk).toBe(true);
    expect(c1.exitPrice).toBeNull();
    expect(c1.totalRisk).toBe(10); // 0.10 * 100 * 1
    // riskPerContract = contractPrice when full risk
    expect(c1.riskPerContract).toBe(0.1);
  });

  it("returns comfortMax, hardMax, and recommendedContracts", () => {
    const result = calculateContractChoices(3000, 0.5);
    expect(result.comfortMax).toBeGreaterThanOrEqual(0);
    expect(result.hardMax).toBeGreaterThanOrEqual(result.comfortMax);
    expect(result.recommendedContracts).toBeGreaterThan(0);
  });
});

// ─── Custom Size via buildChoice ───

describe("buildChoice (canonical custom sizing)", () => {
  it("5 contracts at $0.30 on $3,000 account", () => {
    const result = calculateContractChoices(3000, 0.3);
    const c = buildChoice(0.3, 5, result.riskBudget, result.comfortBudget, result.hardBudget);
    expect(c.cashNeeded).toBe(150); // 0.30 * 100 * 5
  });

  it("custom exit override: entry $1.00, exit $0.50 → exact risk", () => {
    const result = calculateContractChoices(5000, 1.0);
    const c = buildChoice(1.0, 2, result.riskBudget, result.comfortBudget, result.hardBudget, 0.5);
    expect(c.exitPrice).toBe(0.5);
    expect(c.riskPerContract).toBe(0.5);
    expect(c.totalRisk).toBe(100); // (1.00 - 0.50) * 100 * 2
  });

  it("1 contract custom matches standard 1-contract card exactly", () => {
    const result = calculateContractChoices(3000, 0.5);
    const custom = buildChoice(0.5, 1, result.riskBudget, result.comfortBudget, result.hardBudget);
    const s1 = result.choices[0];

    expect(custom.cashNeeded).toBe(s1.cashNeeded);
    expect(custom.maxCutRoom).toBe(s1.maxCutRoom);
    expect(custom.fullPremiumRiskOk).toBe(s1.fullPremiumRiskOk);
    expect(custom.exitPrice).toBe(s1.exitPrice);
    expect(custom.riskPerContract).toBe(s1.riskPerContract);
    expect(custom.totalRisk).toBe(s1.totalRisk);
    expect(custom.tp1).toBe(s1.tp1);
    expect(custom.tp2).toBe(s1.tp2);
    expect(custom.tp3).toBe(s1.tp3);
    expect(custom.status).toBe(s1.status);
  });
});

// ─── Exact Precision Verification ───

describe("exact precision (no rounding)", () => {
  it("exit price is not rounded — uses exact maxCutRoom", () => {
    // $3000 Small account, risk 2% = $60 budget
    // Entry $0.77, 1 contract: maxCutRoom = 60/100 = 0.60
    // exitPrice = 0.77 - 0.60 = 0.17 (exact, NOT rounded to 0.17 or 0.18)
    const result = calculateContractChoices(3000, 0.77);
    const c1 = result.choices[0];
    expect(c1.exitPrice).toBeCloseTo(0.17, 10);
    expect(c1.riskPerContract).toBeCloseTo(0.60, 10);
  });

  it("targets use exact riskPerContract, not rounded values", () => {
    const result = calculateContractChoices(3000, 0.77);
    const c1 = result.choices[0];
    // tp1 = 0.77 + riskPerContract
    expect(c1.tp1).toBeCloseTo(0.77 + c1.riskPerContract, 10);
    expect(c1.tp2).toBeCloseTo(0.77 + 2 * c1.riskPerContract, 10);
    expect(c1.tp3).toBeCloseTo(0.77 + 3 * c1.riskPerContract, 10);
  });

  it("regression: $7.50×1 and $2.50×3 get same status on ~$15,558 account (no FP round-trip error)", () => {
    const balance = 15557.68;
    const r1 = calculateContractChoices(balance, 7.5);
    const r3 = calculateContractChoices(balance, 2.5);
    const c1 = r1.choices[0]; // 1 contract at $7.50 = $750
    const c3 = r3.choices[2]; // 3 contracts at $2.50 = $750
    expect(c1.cashNeeded).toBe(c3.cashNeeded); // both $750
    expect(c1.status).not.toBe("pass");
    expect(c3.status).not.toBe("pass");
    expect(c1.status).toBe(c3.status);
    // totalRisk must not exceed riskBudget
    expect(c1.totalRisk).toBeLessThanOrEqual(r1.riskBudget);
    expect(c3.totalRisk).toBeLessThanOrEqual(r3.riskBudget);
  });
});

// ─── Tier Detection & Budget Calculation ───

describe("tier detection and budgets", () => {
  it("$800 → Micro", () => {
    expect(detectTier(800)).toBe("Micro");
    const d = TIER_DEFAULTS["Micro"];
    expect(d.riskPercent).toBe(2);
    expect(d.preferredSpendPercent).toBe(7.5);
    expect(d.hardMaxSpendPercent).toBe(12.5);
  });

  it("$3,000 → Small with correct dollar budgets", () => {
    expect(detectTier(3000)).toBe("Small");
    const result = calculateContractChoices(3000, 1.0);
    expect(result.riskBudget).toBe(60);
    expect(result.comfortBudget).toBe(150);
    expect(result.hardBudget).toBe(300);
  });

  it("$15,000 → Medium", () => {
    expect(detectTier(15000)).toBe("Medium");
    const result = calculateContractChoices(15000, 1.0);
    expect(result.riskBudget).toBe(150);
    expect(result.comfortBudget).toBe(750);
    expect(result.hardBudget).toBe(1200);
  });

  it("$50,000 → Large", () => {
    expect(detectTier(50000)).toBe("Large");
    const result = calculateContractChoices(50000, 1.0);
    expect(result.riskBudget).toBe(500);
    expect(result.comfortBudget).toBe(2000);
    expect(result.hardBudget).toBe(3000);
  });

  it("boundary: $1,000 is Small, $999 is Micro", () => {
    expect(detectTier(1000)).toBe("Small");
    expect(detectTier(999)).toBe("Micro");
  });

  it("boundary: $5,000 is Medium, $4,999 is Small", () => {
    expect(detectTier(5000)).toBe("Medium");
    expect(detectTier(4999)).toBe("Small");
  });

  it("boundary: $25,000 is Large, $24,999 is Medium", () => {
    expect(detectTier(25000)).toBe("Large");
    expect(detectTier(24999)).toBe("Medium");
  });
});

// ─── formatCurrency ───

describe("formatCurrency", () => {
  it("formats correctly", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
    expect(formatCurrency(0)).toBe("$0.00");
  });
});
