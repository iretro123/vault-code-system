/**
 * Vault Trade Planner — Pure Calculation Engine
 * Long Calls / Long Puts ONLY
 */

export type AccountTierLabel = "Small" | "Medium" | "Large";
export type TradeDirection = "Long Call" | "Long Put";

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
  };
}

export function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function buildCopyText(inputs: PlannerInputs, result: PlannerResult): string {
  const lines = [
    "Vault Trade Plan",
    `- Account Size: ${formatCurrency(inputs.accountSize)}`,
    `- Risk %: ${inputs.riskPercent}%`,
    `- Debit Cap %: ${inputs.debitCapPercent}%`,
    `- Direction: ${inputs.direction}`,
    `- Entry Price (Option): ${formatCurrency(inputs.entryPremium)}`,
    `- Cut Loss At (Option): ${formatCurrency(inputs.stopPremium)}`,
    `- How Many Contracts: ${result.finalContracts}`,
    `- Money Needed to Enter: ${formatCurrency(result.totalPositionCost)}`,
    `- Planned Loss If Stop Hits: ${formatCurrency(result.totalPlannedRisk)}`,
    `- 1:2 Target: ${formatCurrency(result.rr1to2Target)}`,
    `- 1:3 Target: ${formatCurrency(result.rr1to3Target)}`,
    `- TP1: ${formatCurrency(result.tp1Premium)}`,
    `- TP2: ${formatCurrency(result.tp2Premium)}`,
  ];
  if (inputs.dte != null) lines.push(`- DTE: ${inputs.dte}`);
  if (inputs.delta != null) lines.push(`- Delta: ${inputs.delta}`);
  if (inputs.strike != null) lines.push(`- Strike: ${inputs.strike}`);
  return lines.join("\n");
}
