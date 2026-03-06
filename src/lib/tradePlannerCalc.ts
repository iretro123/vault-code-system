/**
 * Vault Trade Planner — Pure Calculation Engine
 * Long Calls / Long Puts ONLY
 */

export type AccountTierLabel = "Micro" | "Small" | "Medium" | "Large";
export type TradeDirection = "Long Call" | "Long Put";
export type TradeVerdict = "SAFE" | "AGGRESSIVE" | "NO_TRADE";
export type PremiumFit = "IDEAL" | "AGGRESSIVE" | "TOO_EXPENSIVE";

export function detectTier(accountSize: number): AccountTierLabel {
  if (accountSize >= 25000) return "Large";
  if (accountSize >= 5000) return "Medium";
  if (accountSize >= 1000) return "Small";
  return "Micro";
}

export interface TierDefaults {
  riskPercent: number;
  preferredSpendPercent: number;
  hardMaxSpendPercent: number;
}

export const TIER_DEFAULTS: Record<AccountTierLabel, TierDefaults> = {
  Micro:  { riskPercent: 2, preferredSpendPercent: 7.5, hardMaxSpendPercent: 12.5 },
  Small:  { riskPercent: 2, preferredSpendPercent: 5, hardMaxSpendPercent: 10 },
  Medium: { riskPercent: 1, preferredSpendPercent: 5, hardMaxSpendPercent: 8 },
  Large:  { riskPercent: 1, preferredSpendPercent: 4, hardMaxSpendPercent: 6 },
};

export interface PlannerInputs {
  accountSize: number;
  riskPercent: number;
  preferredSpendPercent: number;
  hardMaxSpendPercent: number;
  direction: TradeDirection;
  entryPremium: number;
  stopPremium: number;
  ticker?: string;
  dte?: number;
  delta?: number;
  strike?: number;
}

export interface PlannerResult {
  riskBudget: number;
  preferredSpendBudget: number;
  hardSpendBudget: number;
  idealPremiumMax: number;
  aggressivePremiumMax: number;
  costPerContract: number;
  riskPerContractPremium: number;
  plannedRiskPerContract: number;
  contractsByRisk: number;
  contractsByPreferredSpend: number;
  contractsByHardSpend: number;
  safeContracts: number;
  maxContracts: number;
  finalContracts: number;
  totalPositionCost: number;
  totalPlannedRisk: number;
  tp1Premium: number;
  mainTarget: number;
  tp2Premium: number;
  profitAtTP1: number;
  profitAtMain: number;
  profitAtTP2: number;
  riskCheckPass: boolean;
  preferredSpendCheckPass: boolean;
  hardSpendCheckPass: boolean;
  maxPossibleLoss: number;
  accountRiskPercent: number;
  accountExposurePercent: number;
  breakEvenAtExpiry: number | null;
  thetaWarning: string | null;
  deltaExposure: number | null;
  verdict: TradeVerdict;
  verdictReason: string;
  sizingExplanation: string;
  maxOneContractStopWidth: number;
  premiumFit: PremiumFit;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateInputs(inputs: PlannerInputs): ValidationError[] {
  const errors: ValidationError[] = [];
  if (inputs.accountSize <= 0) errors.push({ field: "accountSize", message: "Account Size must be > 0" });
  if (inputs.riskPercent <= 0) errors.push({ field: "riskPercent", message: "Risk % must be > 0" });
  if (inputs.preferredSpendPercent <= 0) errors.push({ field: "preferredSpendPercent", message: "Preferred Spend % must be > 0" });
  if (inputs.hardMaxSpendPercent <= 0) errors.push({ field: "hardMaxSpendPercent", message: "Hard Max Spend % must be > 0" });
  if (inputs.entryPremium <= 0) errors.push({ field: "entryPremium", message: "Buy Price must be > 0" });
  if (inputs.stopPremium < 0) errors.push({ field: "stopPremium", message: "Stop Price must be >= 0" });
  if (inputs.stopPremium >= inputs.entryPremium && inputs.entryPremium > 0) {
    errors.push({ field: "stopPremium", message: "Stop Price must be lower than Buy Price." });
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
  const preferredSpendBudget = inputs.accountSize * (inputs.preferredSpendPercent / 100);
  const hardSpendBudget = inputs.accountSize * (inputs.hardMaxSpendPercent / 100);
  const idealPremiumMax = preferredSpendBudget / 100;
  const aggressivePremiumMax = hardSpendBudget / 100;

  const costPerContract = inputs.entryPremium * 100;
  const riskPerContractPremium = inputs.entryPremium - inputs.stopPremium;
  const plannedRiskPerContract = riskPerContractPremium * 100;

  const contractsByRisk = plannedRiskPerContract > 0 ? Math.floor(riskBudget / plannedRiskPerContract) : 0;
  const contractsByPreferredSpend = costPerContract > 0 ? Math.floor(preferredSpendBudget / costPerContract) : 0;
  const contractsByHardSpend = costPerContract > 0 ? Math.floor(hardSpendBudget / costPerContract) : 0;

  const safeContracts = Math.max(0, Math.min(contractsByRisk, contractsByPreferredSpend));
  const maxContracts = Math.max(0, Math.min(contractsByRisk, contractsByHardSpend));
  const finalContracts = safeContracts > 0 ? safeContracts : maxContracts;

  const totalPositionCost = finalContracts * costPerContract;
  const totalPlannedRisk = finalContracts * plannedRiskPerContract;

  // Targets: r = entry - stop
  const r = riskPerContractPremium;
  const tp1Premium = inputs.entryPremium + r;        // 1:1
  const mainTarget = inputs.entryPremium + 2 * r;    // 1:2
  const tp2Premium = inputs.entryPremium + 3 * r;    // 1:3

  const profitAtTP1 = (tp1Premium - inputs.entryPremium) * 100 * finalContracts;
  const profitAtMain = (mainTarget - inputs.entryPremium) * 100 * finalContracts;
  const profitAtTP2 = (tp2Premium - inputs.entryPremium) * 100 * finalContracts;

  const riskCheckPass = totalPlannedRisk <= riskBudget;
  const preferredSpendCheckPass = totalPositionCost <= preferredSpendBudget;
  const hardSpendCheckPass = totalPositionCost <= hardSpendBudget;

  const maxPossibleLoss = totalPositionCost;
  const accountRiskPercent = inputs.accountSize > 0 ? (totalPlannedRisk / inputs.accountSize) * 100 : 0;
  const accountExposurePercent = inputs.accountSize > 0 ? (totalPositionCost / inputs.accountSize) * 100 : 0;

  let deltaExposure: number | null = null;
  if (inputs.delta != null && inputs.delta !== 0) {
    deltaExposure = Math.abs(inputs.delta) * 100 * finalContracts;
  }

  let breakEvenAtExpiry: number | null = null;
  if (inputs.strike != null && inputs.strike > 0) {
    breakEvenAtExpiry = inputs.direction === "Long Call"
      ? inputs.strike + inputs.entryPremium
      : inputs.strike - inputs.entryPremium;
  }

  let thetaWarning: string | null = null;
  if (inputs.dte != null) {
    if (inputs.dte <= 3) {
      thetaWarning = "Extreme time decay under 3 DTE — option loses value fast.";
    } else if (inputs.dte <= 7) {
      thetaWarning = "Theta accelerates under 7 DTE — time is working against you.";
    }
  }

  // Verdict
  let verdict: TradeVerdict;
  let verdictReason: string;
  if (contractsByRisk < 1 || contractsByHardSpend < 1) {
    verdict = "NO_TRADE";
    verdictReason = "This setup risks too much or costs too much for your account rules.";
  } else if (contractsByPreferredSpend < 1) {
    verdict = "AGGRESSIVE";
    verdictReason = "Fits your stop-risk rule, but premium is above your preferred spend range.";
  } else {
    verdict = "SAFE";
    verdictReason = "Fits both your stop-risk rule and your preferred spend range.";
  }

  // Sizing explanation
  let sizingExplanation: string;
  if (finalContracts === 0) {
    sizingExplanation = "This trade does not fit because the contract cost or stop risk is too high for your account rules.";
  } else if (contractsByRisk <= contractsByPreferredSpend) {
    sizingExplanation = `Your risk limit (${inputs.riskPercent}%) was the binding constraint — ${finalContracts} contract${finalContracts > 1 ? "s" : ""} allowed.`;
  } else {
    sizingExplanation = `Your spend cap was the binding constraint — ${finalContracts} contract${finalContracts > 1 ? "s" : ""} allowed.`;
  }

  return {
    riskBudget,
    preferredSpendBudget,
    hardSpendBudget,
    idealPremiumMax,
    aggressivePremiumMax,
    costPerContract,
    riskPerContractPremium,
    plannedRiskPerContract,
    contractsByRisk,
    contractsByPreferredSpend,
    contractsByHardSpend,
    safeContracts,
    maxContracts,
    finalContracts,
    totalPositionCost,
    totalPlannedRisk,
    tp1Premium,
    mainTarget,
    tp2Premium,
    profitAtTP1,
    profitAtMain,
    profitAtTP2,
    riskCheckPass,
    preferredSpendCheckPass,
    hardSpendCheckPass,
    maxPossibleLoss,
    accountRiskPercent,
    accountExposurePercent,
    breakEvenAtExpiry,
    thetaWarning,
    deltaExposure,
    verdict,
    verdictReason,
    sizingExplanation,
    maxOneContractStopWidth: riskBudget / 100,
    premiumFit: inputs.entryPremium <= idealPremiumMax
      ? "IDEAL"
      : inputs.entryPremium <= aggressivePremiumMax
        ? "AGGRESSIVE"
        : "TOO_EXPENSIVE",
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
    `- Preferred Spend %: ${inputs.preferredSpendPercent}%`,
    `- Hard Max Spend %: ${inputs.hardMaxSpendPercent}%`,
    `- Direction: ${inputs.direction}`,
    `- Buy Price: ${formatCurrency(inputs.entryPremium)}`,
    `- Stop Price: ${formatCurrency(inputs.stopPremium)}`,
    `- Verdict: ${result.verdict}`,
    `- Safe Contracts: ${result.safeContracts}`,
    `- Max Contracts: ${result.maxContracts}`,
    `- Entry Cost: ${formatCurrency(result.totalPositionCost)}`,
    `- Planned Loss: ${formatCurrency(result.totalPlannedRisk)}`,
    `- TP1 (1:1): ${formatCurrency(result.tp1Premium)} (+${formatCurrency(result.profitAtTP1)})`,
    `- Main Target (1:2): ${formatCurrency(result.mainTarget)} (+${formatCurrency(result.profitAtMain)})`,
    `- TP2 (1:3): ${formatCurrency(result.tp2Premium)} (+${formatCurrency(result.profitAtTP2)})`,
    `- Account Risk: ${result.accountRiskPercent.toFixed(1)}%`,
    `- Account Exposure: ${result.accountExposurePercent.toFixed(1)}%`,
  ].filter(Boolean) as string[];

  if (result.breakEvenAtExpiry != null) lines.push(`- Break-Even at Expiry: ${formatCurrency(result.breakEvenAtExpiry)}`);
  if (inputs.dte != null) lines.push(`- DTE: ${inputs.dte}`);
  if (result.thetaWarning) lines.push(`- ⚠ ${result.thetaWarning}`);
  return lines.join("\n");
}
