/**
 * Vault Trade Planner — Pure Calculation Engine
 * Long Calls / Long Puts ONLY
 */

export type AccountTierLabel = "Small" | "Medium" | "Large";
export type TradeDirection = "Long Call" | "Long Put";
export type TradeVerdict = "PASS" | "CAUTION" | "NO_TRADE";

export function detectTier(accountSize: number): AccountTierLabel {
  if (accountSize >= 50000) return "Large";
  if (accountSize >= 15000) return "Medium";
  return "Small";
}

export interface TierDefaults {
  riskPercent: number;
  debitCapPercent: number;
}

export const TIER_DEFAULTS: Record<AccountTierLabel, TierDefaults> = {
  Small:  { riskPercent: 2, debitCapPercent: 5 },
  Medium: { riskPercent: 1, debitCapPercent: 5 },
  Large:  { riskPercent: 1, debitCapPercent: 4 },
};

export interface PlannerInputs {
  accountSize: number;
  riskPercent: number;
  debitCapPercent: number;
  direction: TradeDirection;
  entryPremium: number;
  stopPremium: number;
  tp1Percent: number;
  tp2Percent: number;
  // optional
  ticker?: string;
  dte?: number;
  delta?: number;
  strike?: number;
  chartStopLevel?: number;
  underlyingEntry?: number;
}

export interface PlannerResult {
  riskBudget: number;
  debitCapDollars: number;
  costPerContract: number;
  plannedRiskPerContract: number;
  contractsByRisk: number;
  contractsByDebit: number;
  finalContracts: number;
  totalPositionCost: number;
  totalPlannedRisk: number;
  rr1to2Target: number;
  rr1to3Target: number;
  tp1Premium: number;
  tp2Premium: number;
  riskCheckPass: boolean;
  debitCheckPass: boolean;
  deltaExposure: number | null;
  riskPerContractPremium: number;
  // Options-specific additions
  maxPossibleLoss: number;
  profitAtRR2: number;
  profitAtRR3: number;
  profitAtTP1: number;
  profitAtTP2: number;
  accountRiskPercent: number;
  accountExposurePercent: number;
  breakEvenAtExpiry: number | null;
  thetaWarning: string | null;
  verdict: TradeVerdict;
  verdictReason: string;
  sizingExplanation: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateInputs(inputs: PlannerInputs): ValidationError[] {
  const errors: ValidationError[] = [];
  if (inputs.accountSize <= 0) errors.push({ field: "accountSize", message: "Account Size must be > 0" });
  if (inputs.riskPercent <= 0) errors.push({ field: "riskPercent", message: "Risk % must be > 0" });
  if (inputs.debitCapPercent <= 0) errors.push({ field: "debitCapPercent", message: "Debit Cap % must be > 0" });
  if (inputs.entryPremium <= 0) errors.push({ field: "entryPremium", message: "Entry Price must be > 0" });
  if (inputs.stopPremium < 0) errors.push({ field: "stopPremium", message: "Cut Loss At must be >= 0" });
  if (inputs.stopPremium >= inputs.entryPremium && inputs.entryPremium > 0) {
    errors.push({ field: "stopPremium", message: "Cut Loss At must be lower than Entry Price for long options." });
  }
  if (inputs.dte != null && inputs.dte <= 0) {
    errors.push({ field: "dte", message: "Days Left must be > 0" });
  }
  if (inputs.delta != null && (inputs.delta < -1 || inputs.delta > 1)) {
    errors.push({ field: "delta", message: "Delta must be between -1 and 1" });
  }
  return errors;
}

export function calculatePlan(inputs: PlannerInputs): PlannerResult {
  const riskBudget = inputs.accountSize * (inputs.riskPercent / 100);
  const debitCapDollars = inputs.accountSize * (inputs.debitCapPercent / 100);
  const costPerContract = inputs.entryPremium * 100;
  const riskPerContractPremium = inputs.entryPremium - inputs.stopPremium;
  const plannedRiskPerContract = riskPerContractPremium * 100;

  const contractsByRisk = plannedRiskPerContract > 0 ? Math.floor(riskBudget / plannedRiskPerContract) : 0;
  const contractsByDebit = costPerContract > 0 ? Math.floor(debitCapDollars / costPerContract) : 0;
  const finalContracts = Math.max(0, Math.min(contractsByRisk, contractsByDebit));

  const totalPositionCost = finalContracts * costPerContract;
  const totalPlannedRisk = finalContracts * plannedRiskPerContract;

  const rr1to2Target = inputs.entryPremium + 2 * riskPerContractPremium;
  const rr1to3Target = inputs.entryPremium + 3 * riskPerContractPremium;
  const tp1Premium = inputs.entryPremium * (1 + inputs.tp1Percent / 100);
  const tp2Premium = inputs.entryPremium * (1 + inputs.tp2Percent / 100);

  const riskCheckPass = totalPlannedRisk <= riskBudget;
  const debitCheckPass = totalPositionCost <= debitCapDollars;

  let deltaExposure: number | null = null;
  if (inputs.delta != null && inputs.delta !== 0) {
    deltaExposure = Math.abs(inputs.delta) * 100 * finalContracts;
  }

  // Options-specific: max possible loss = total premium paid (long options only)
  const maxPossibleLoss = totalPositionCost;

  // Dollar profit at each target level
  const profitAtRR2 = (rr1to2Target - inputs.entryPremium) * 100 * finalContracts;
  const profitAtRR3 = (rr1to3Target - inputs.entryPremium) * 100 * finalContracts;
  const profitAtTP1 = (tp1Premium - inputs.entryPremium) * 100 * finalContracts;
  const profitAtTP2 = (tp2Premium - inputs.entryPremium) * 100 * finalContracts;

  // Account context
  const accountRiskPercent = inputs.accountSize > 0 ? (totalPlannedRisk / inputs.accountSize) * 100 : 0;
  const accountExposurePercent = inputs.accountSize > 0 ? (totalPositionCost / inputs.accountSize) * 100 : 0;

  // Break-even at expiry (intrinsic only)
  let breakEvenAtExpiry: number | null = null;
  if (inputs.strike != null && inputs.strike > 0) {
    breakEvenAtExpiry = inputs.direction === "Long Call"
      ? inputs.strike + inputs.entryPremium
      : inputs.strike - inputs.entryPremium;
  }

  // Theta decay warning
  let thetaWarning: string | null = null;
  if (inputs.dte != null) {
    if (inputs.dte <= 3) {
      thetaWarning = "Extreme time decay under 3 DTE — option loses value fast.";
    } else if (inputs.dte <= 7) {
      thetaWarning = "Theta accelerates under 7 DTE — time is working against you.";
    }
  }

  // Verdict system
  let verdict: TradeVerdict;
  let verdictReason: string;
  if (finalContracts === 0) {
    verdict = "NO_TRADE";
    verdictReason = "This setup does not fit your account rules. The contract cost or stop risk is too high.";
  } else if (
    !riskCheckPass || !debitCheckPass ||
    accountRiskPercent > inputs.riskPercent * 0.85 ||
    (finalContracts === 1 && contractsByRisk !== contractsByDebit) ||
    (inputs.dte != null && inputs.dte <= 3)
  ) {
    verdict = "CAUTION";
    verdictReason = finalContracts === 1
      ? "Trade fits but is tight — only 1 contract allowed."
      : accountRiskPercent > inputs.riskPercent * 0.85
        ? "Trade is near your risk limit. Watch sizing carefully."
        : (inputs.dte != null && inputs.dte <= 3)
          ? "Extreme theta decay — this trade needs fast execution."
          : "Trade technically fits but is aggressive for your account.";
  } else {
    verdict = "PASS";
    verdictReason = "Trade size fits within your risk and spend rules.";
  }

  // Sizing explanation
  let sizingExplanation: string;
  if (finalContracts === 0) {
    sizingExplanation = "This trade does not fit because the contract cost or stop risk is too high for your account rules.";
  } else if (contractsByRisk <= contractsByDebit) {
    sizingExplanation = `VAULT checked both your risk limit and your spend cap, then used the smaller allowed size. Your risk limit (${inputs.riskPercent}%) was the binding constraint — that is why this trade allows ${finalContracts} contract${finalContracts > 1 ? "s" : ""}.`;
  } else {
    sizingExplanation = `VAULT checked both your risk limit and your spend cap, then used the smaller allowed size. Your spend cap (${inputs.debitCapPercent}%) was the binding constraint — that is why this trade allows ${finalContracts} contract${finalContracts > 1 ? "s" : ""}.`;
  }

  return {
    riskBudget,
    debitCapDollars,
    costPerContract,
    plannedRiskPerContract,
    contractsByRisk,
    contractsByDebit,
    finalContracts,
    totalPositionCost,
    totalPlannedRisk,
    rr1to2Target,
    rr1to3Target,
    tp1Premium,
    tp2Premium,
    riskCheckPass,
    debitCheckPass,
    deltaExposure,
    riskPerContractPremium,
    maxPossibleLoss,
    profitAtRR2,
    profitAtRR3,
    profitAtTP1,
    profitAtTP2,
    accountRiskPercent,
    accountExposurePercent,
    breakEvenAtExpiry,
    thetaWarning,
    verdict,
    verdictReason,
    sizingExplanation,
  };
}

export function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function buildCopyText(inputs: PlannerInputs, result: PlannerResult): string {
  const lines = [
    "Vault Trade Plan",
    inputs.ticker ? `- Ticker: ${inputs.ticker.toUpperCase()}` : null,
    `- Account Size: ${formatCurrency(inputs.accountSize)}`,
    `- Risk %: ${inputs.riskPercent}%`,
    `- Debit Cap %: ${inputs.debitCapPercent}%`,
    `- Direction: ${inputs.direction}`,
    `- Entry Price (Option): ${formatCurrency(inputs.entryPremium)}`,
    `- Cut Loss At (Option): ${formatCurrency(inputs.stopPremium)}`,
    `- How Many Contracts: ${result.finalContracts}`,
    `- Money Needed to Enter: ${formatCurrency(result.totalPositionCost)}`,
    `- Planned Loss If Stop Hits: ${formatCurrency(result.totalPlannedRisk)}`,
    `- Max Possible Loss (Premium Paid): ${formatCurrency(result.maxPossibleLoss)}`,
    `- 1:2 Target: ${formatCurrency(result.rr1to2Target)} (profit: ${formatCurrency(result.profitAtRR2)})`,
    `- 1:3 Target: ${formatCurrency(result.rr1to3Target)} (profit: ${formatCurrency(result.profitAtRR3)})`,
    `- TP1: ${formatCurrency(result.tp1Premium)} (profit: ${formatCurrency(result.profitAtTP1)})`,
    `- TP2: ${formatCurrency(result.tp2Premium)} (profit: ${formatCurrency(result.profitAtTP2)})`,
    `- Account Risk: ${result.accountRiskPercent.toFixed(1)}%`,
    `- Account Exposure: ${result.accountExposurePercent.toFixed(1)}%`,
  ].filter(Boolean) as string[];

  if (result.breakEvenAtExpiry != null) lines.push(`- Break-Even at Expiry: ${formatCurrency(result.breakEvenAtExpiry)}`);
  if (inputs.dte != null) lines.push(`- DTE: ${inputs.dte}`);
  if (inputs.delta != null) lines.push(`- Delta: ${inputs.delta}`);
  if (inputs.strike != null) lines.push(`- Strike: ${inputs.strike}`);
  if (result.thetaWarning) lines.push(`- ⚠ ${result.thetaWarning}`);
  return lines.join("\n");
}
