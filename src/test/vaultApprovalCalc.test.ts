import { describe, it, expect } from "vitest";
import {
  calculateContractChoices,
  formatCurrency,
  type ContractChoice,
} from "@/lib/vaultApprovalCalc";
import { detectTier, TIER_DEFAULTS } from "@/lib/tradePlannerCalc";

// ─── Test 1: Contract Choice Calculations ───

describe("calculateContractChoices", () => {
  it("$2,000 account, $0.50 entry — 1-2 fits, recommended exists", () => {
    const result = calculateContractChoices(2000, 0.5);
    expect(result.choices).toHaveLength(4);
    expect(result.allPass).toBe(false);

    // 1 contract: cash = $50, should fit easily
    const c1 = result.choices[0];
    expect(c1.contracts).toBe(1);
    expect(c1.cashNeeded).toBe(50);
    expect(c1.status).toBe("fits");

    // 2 contracts: cash = $100, still within comfort ($2000 * 5% = $100)
    const c2 = result.choices[1];
    expect(c2.contracts).toBe(2);
    expect(c2.cashNeeded).toBe(100);
    expect(["fits", "tight"]).toContain(c2.status);

    // Exactly one recommended
    const recommended = result.choices.filter((c) => c.isRecommended);
    expect(recommended).toHaveLength(1);
  });

  it("$5,000 account, $1.50 entry — verifies cash/exit/targets", () => {
    const result = calculateContractChoices(5000, 1.5);
    // Tier: Medium (>=5000), risk 1%, comfort 5%, hard 8%
    expect(result.accountLevel).toBe("Medium");
    expect(result.riskBudget).toBe(50); // 5000 * 0.01

    const c1 = result.choices[0];
    expect(c1.cashNeeded).toBe(150); // 1.50 * 100 * 1
    // maxCutRoom = 50 / 100 = 0.50
    expect(c1.maxCutRoom).toBe(0.5);
    // fullPremiumRiskOk: 0.50 >= 1.50? No
    expect(c1.fullPremiumRiskOk).toBe(false);
    // suggestedExit = ceil((1.50 - 0.50) * 100) / 100 = 1.00
    expect(c1.suggestedExit).toBe(1.0);
    // r = 1.50 - 1.00 = 0.50
    expect(c1.r).toBe(0.5);
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
    // riskBudget = 10000*0.01 = 100, maxCutRoom for 1 contract = 100/100 = 1.00 >= 0.10
    const c1 = result.choices[0];
    expect(c1.fullPremiumRiskOk).toBe(true);
    expect(c1.suggestedExit).toBeNull();
    expect(c1.worstCaseLoss).toBe(10); // 0.10 * 100 * 1
  });
});

// ─── Test 2: Custom Size Calculator Logic ───

describe("custom size calculations", () => {
  // Replicate the custom choice math from VaultTradePlanner useMemo
  function buildCustomChoice(
    accountSize: number,
    entryPremium: number,
    customContracts: number,
    customExit?: number
  ): ContractChoice {
    const result = calculateContractChoices(accountSize, entryPremium);
    const { riskBudget, comfortBudget, hardBudget } = result;
    const n = customContracts;

    const cashNeeded = entryPremium * 100 * n;
    const maxCutRoom = riskBudget / (100 * n);
    const fullPremiumRiskOk = maxCutRoom >= entryPremium;

    let suggestedExit: number | null;
    let worstCaseLoss: number;

    if (customExit !== undefined) {
      suggestedExit = customExit;
      worstCaseLoss = (entryPremium - customExit) * 100 * n;
    } else if (fullPremiumRiskOk) {
      suggestedExit = null;
      worstCaseLoss = cashNeeded;
    } else {
      suggestedExit = Math.max(0.01, Math.ceil((entryPremium - maxCutRoom) * 100) / 100);
      worstCaseLoss = (entryPremium - suggestedExit) * 100 * n;
    }

    let status: "fits" | "tight" | "pass";
    if (cashNeeded <= comfortBudget && worstCaseLoss <= riskBudget) {
      status = "fits";
    } else if (cashNeeded <= hardBudget && worstCaseLoss <= riskBudget) {
      status = "tight";
    } else {
      status = "pass";
    }

    const r = suggestedExit !== null ? entryPremium - suggestedExit : entryPremium;

    return {
      contracts: n,
      cashNeeded,
      maxCutRoom,
      suggestedExit,
      worstCaseLoss,
      fullPremiumRiskOk,
      tp1: Math.round((entryPremium + r) * 100) / 100,
      tp2: Math.round((entryPremium + 2 * r) * 100) / 100,
      tp3: Math.round((entryPremium + 3 * r) * 100) / 100,
      r,
      status,
      coachingNote: "",
      isRecommended: false,
    };
  }

  it("5 contracts at $0.30 on $3,000 account", () => {
    const c = buildCustomChoice(3000, 0.3, 5);
    expect(c.cashNeeded).toBe(150); // 0.30 * 100 * 5
    // Small tier: comfort = 3000*0.05 = 150, hard = 300, risk = 60
    expect(c.cashNeeded).toBeLessThanOrEqual(150); // exactly at comfort
  });

  it("custom exit override: entry $1.00, exit $0.50 → worst case correct", () => {
    const c = buildCustomChoice(5000, 1.0, 2, 0.5);
    expect(c.suggestedExit).toBe(0.5);
    expect(c.worstCaseLoss).toBe(100); // (1.00 - 0.50) * 100 * 2
  });

  it("1 contract custom matches standard 1-contract card", () => {
    const standard = calculateContractChoices(3000, 0.5);
    const custom = buildCustomChoice(3000, 0.5, 1);
    const s1 = standard.choices[0];

    expect(custom.cashNeeded).toBe(s1.cashNeeded);
    expect(custom.maxCutRoom).toBe(s1.maxCutRoom);
    expect(custom.fullPremiumRiskOk).toBe(s1.fullPremiumRiskOk);
    expect(custom.suggestedExit).toBe(s1.suggestedExit);
    expect(custom.worstCaseLoss).toBe(s1.worstCaseLoss);
    expect(custom.status).toBe(s1.status);
  });
});

// ─── Test 5: Tier Detection & Budget Calculation ───

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
    expect(result.riskBudget).toBe(60);      // 3000 * 0.02
    expect(result.comfortBudget).toBe(150);   // 3000 * 0.05
    expect(result.hardBudget).toBe(300);      // 3000 * 0.10
  });

  it("$15,000 → Medium", () => {
    expect(detectTier(15000)).toBe("Medium");
    const result = calculateContractChoices(15000, 1.0);
    expect(result.riskBudget).toBe(150);     // 15000 * 0.01
    expect(result.comfortBudget).toBe(750);  // 15000 * 0.05
    expect(result.hardBudget).toBe(1200);    // 15000 * 0.08
  });

  it("$50,000 → Large", () => {
    expect(detectTier(50000)).toBe("Large");
    const result = calculateContractChoices(50000, 1.0);
    expect(result.riskBudget).toBe(500);     // 50000 * 0.01
    expect(result.comfortBudget).toBe(2000); // 50000 * 0.04
    expect(result.hardBudget).toBe(3000);    // 50000 * 0.06
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
