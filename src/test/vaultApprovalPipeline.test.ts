import { describe, it, expect } from "vitest";
import {
  calculateContractChoices,
  type ContractChoice,
  type ApprovalResult,
} from "@/lib/vaultApprovalCalc";

/**
 * Replicate the buildPlanData logic from VaultTradePlanner
 * to verify the data shape matches approved_plans schema.
 */
function buildPlanData(
  choice: ContractChoice,
  approvalResult: ApprovalResult,
  entryPremium: number,
  accountBalance: number,
  direction: string,
  ticker?: string
) {
  return {
    ticker: ticker?.toUpperCase() || null,
    direction,
    entry_price_planned: entryPremium,
    contracts_planned: choice.contracts,
    stop_price_planned: choice.exitPrice,
    max_loss_planned: choice.totalRisk,
    cash_needed_planned: choice.cashNeeded,
    tp1_planned: choice.tp1,
    tp2_planned: choice.tp2,
    approval_status: choice.status,
    account_balance_snapshot: accountBalance,
    trade_loss_limit_snapshot: approvalResult.tradeLossLimit,
    account_level_snapshot: approvalResult.accountLevel,
  };
}

describe("plan data shape for approved_plans", () => {
  it("has all required fields with correct types", () => {
    const result = calculateContractChoices(3000, 0.5);
    const choice = result.choices[0];
    const plan = buildPlanData(choice, result, 0.5, 3000, "calls", "spy");

    expect(plan).toHaveProperty("ticker");
    expect(plan).toHaveProperty("direction");
    expect(plan).toHaveProperty("entry_price_planned");
    expect(plan).toHaveProperty("contracts_planned");
    expect(plan).toHaveProperty("stop_price_planned");
    expect(plan).toHaveProperty("max_loss_planned");
    expect(plan).toHaveProperty("cash_needed_planned");
    expect(plan).toHaveProperty("tp1_planned");
    expect(plan).toHaveProperty("tp2_planned");
    expect(plan).toHaveProperty("approval_status");
    expect(plan).toHaveProperty("account_balance_snapshot");
    expect(plan).toHaveProperty("trade_loss_limit_snapshot");
    expect(plan).toHaveProperty("account_level_snapshot");

    expect(typeof plan.entry_price_planned).toBe("number");
    expect(typeof plan.contracts_planned).toBe("number");
    expect(typeof plan.max_loss_planned).toBe("number");
    expect(typeof plan.cash_needed_planned).toBe("number");
    expect(typeof plan.account_balance_snapshot).toBe("number");
    expect(typeof plan.trade_loss_limit_snapshot).toBe("number");
    expect(typeof plan.account_level_snapshot).toBe("string");
    expect(["fits", "tight", "pass"]).toContain(plan.approval_status);
  });

  it("ticker is uppercased", () => {
    const result = calculateContractChoices(3000, 0.5);
    const plan = buildPlanData(result.choices[0], result, 0.5, 3000, "calls", "aapl");
    expect(plan.ticker).toBe("AAPL");
  });

  it("null ticker when not provided", () => {
    const result = calculateContractChoices(3000, 0.5);
    const plan = buildPlanData(result.choices[0], result, 0.5, 3000, "calls");
    expect(plan.ticker).toBeNull();
  });

  it("stop_price_planned is null when full premium risk is OK", () => {
    const result = calculateContractChoices(10000, 0.1);
    const c1 = result.choices[0];
    expect(c1.fullPremiumRiskOk).toBe(true);
    const plan = buildPlanData(c1, result, 0.1, 10000, "calls");
    expect(plan.stop_price_planned).toBeNull();
  });

  it("trade_loss_limit_snapshot equals risk budget", () => {
    const result = calculateContractChoices(5000, 1.0);
    const plan = buildPlanData(result.choices[0], result, 1.0, 5000, "puts");
    expect(plan.trade_loss_limit_snapshot).toBe(result.riskBudget);
    expect(plan.trade_loss_limit_snapshot).toBe(50);
  });

  it("max_loss_planned matches choice totalRisk", () => {
    const result = calculateContractChoices(3000, 0.8);
    for (const choice of result.choices) {
      const plan = buildPlanData(choice, result, 0.8, 3000, "calls");
      expect(plan.max_loss_planned).toBe(choice.totalRisk);
    }
  });
});
