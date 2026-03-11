/**
 * VAULT Approval — Canonical Options Sizing Engine
 * 
 * RULES:
 * - All math is exact precision. No rounding anywhere in the engine.
 * - Display formatting is a UI-only concern (formatCurrency).
 * - Targets are strictly 1:1, 1:2, 1:3 from the exact selected risk.
 * - The same values flow to quick picks, custom size, hero card, saved plans, and My Trades.
 */

import { detectTier, TIER_DEFAULTS, type AccountTierLabel } from "./tradePlannerCalc";

export type ApprovalStatus = "fits" | "tight" | "pass";

export interface ContractChoice {
  contracts: number;
  cashNeeded: number;
  /** Max premium drop per contract that stays within risk budget */
  maxCutRoom: number;
  /** Exact exit price. null = full premium risk is acceptable */
  exitPrice: number | null;
  /** riskPerContract = contractPrice - exitPrice (or contractPrice if full risk) */
  riskPerContract: number;
  /** totalRisk = riskPerContract * 100 * contracts */
  totalRisk: number;
  /** Whether the risk budget covers the full contract premium */
  fullPremiumRiskOk: boolean;
  tp1: number;
  tp2: number;
  tp3: number;
  status: ApprovalStatus;
  coachingNote: string;
  isRecommended: boolean;
}

export interface ApprovalResult {
  choices: ContractChoice[];
  riskBudget: number;
  comfortBudget: number;
  hardBudget: number;
  accountLevel: AccountTierLabel;
  tradeLossLimit: number;
  /** Max contracts that fit within comfort spend budget */
  comfortMax: number;
  /** Max contracts that fit within hard spend budget */
  hardMax: number;
  /** The recommended contract count (0 if all pass) */
  recommendedContracts: number;
  allPass: boolean;
}

/**
 * Build a single ContractChoice for a given size. This is the canonical
 * sizing function used by both quick picks and custom size.
 */
export function buildChoice(
  contractPrice: number,
  contracts: number,
  riskBudget: number,
  comfortBudget: number,
  hardBudget: number,
  exitOverride?: number | null,
): ContractChoice {
  const n = contracts;
  const cashNeeded = contractPrice * 100 * n;
  const maxCutRoom = riskBudget / (100 * n);
  const fullPremiumRiskOk = maxCutRoom >= contractPrice;

  let exitPrice: number | null;
  let riskPerContract: number;
  let totalRisk: number;

  if (exitOverride !== undefined && exitOverride !== null && exitOverride > 0 && exitOverride < contractPrice) {
    // User-specified exit
    exitPrice = exitOverride;
    riskPerContract = contractPrice - exitOverride;
    totalRisk = riskPerContract * 100 * n;
  } else if (fullPremiumRiskOk) {
    // Full premium risk is within budget — no exit needed
    exitPrice = null;
    riskPerContract = contractPrice;
    totalRisk = cashNeeded;
  } else {
    // Exact exit from risk budget — no rounding
    exitPrice = contractPrice - maxCutRoom;
    // Floor to 0.01 min (can't have negative/zero exit)
    if (exitPrice < 0.01) exitPrice = 0.01;
    riskPerContract = contractPrice - exitPrice;
    totalRisk = riskPerContract * 100 * n;
  }

  // Status
  let status: ApprovalStatus;
  if (cashNeeded <= comfortBudget && totalRisk <= riskBudget) {
    status = "fits";
  } else if (cashNeeded <= hardBudget && totalRisk <= riskBudget) {
    status = "tight";
  } else {
    status = "pass";
  }

  // Targets: strict 1:1, 1:2, 1:3 from exact selected risk
  const tp1 = contractPrice + riskPerContract;
  const tp2 = contractPrice + 2 * riskPerContract;
  const tp3 = contractPrice + 3 * riskPerContract;

  // Coaching note
  let coachingNote: string;
  if (status === "pass") {
    coachingNote = "Too expensive for this account.";
  } else if (status === "fits" && n === 1) {
    coachingNote = "Fits your account.";
  } else if (status === "fits" && fullPremiumRiskOk) {
    coachingNote = "Fits your account. Full premium risk is covered.";
  } else if (status === "fits") {
    coachingNote = n <= 2 ? "Most balanced setup for this account." : "More size means a tighter exit.";
  } else {
    coachingNote = "This pushes size, so discipline matters.";
  }

  return {
    contracts: n,
    cashNeeded,
    maxCutRoom,
    exitPrice,
    riskPerContract,
    totalRisk,
    fullPremiumRiskOk,
    tp1,
    tp2,
    tp3,
    status,
    coachingNote,
    isRecommended: false,
  };
}

export function calculateContractChoices(
  accountSize: number,
  contractPrice: number,
  overrides?: {
    riskPercent?: number;
    comfortSpendPercent?: number;
    hardSpendPercent?: number;
  }
): ApprovalResult {
  const tier = detectTier(accountSize);
  const defaults = TIER_DEFAULTS[tier];

  const riskPercent = overrides?.riskPercent ?? defaults.riskPercent;
  const comfortPercent = overrides?.comfortSpendPercent ?? defaults.preferredSpendPercent;
  const hardPercent = overrides?.hardSpendPercent ?? defaults.hardMaxSpendPercent;

  const riskBudget = accountSize * (riskPercent / 100);
  const comfortBudget = accountSize * (comfortPercent / 100);
  const hardBudget = accountSize * (hardPercent / 100);

  const costPerContract = contractPrice * 100;
  const comfortMax = costPerContract > 0 ? Math.floor(comfortBudget / costPerContract) : 0;
  const hardMax = costPerContract > 0 ? Math.floor(hardBudget / costPerContract) : 0;

  const choices: ContractChoice[] = [];

  for (let n = 1; n <= 4; n++) {
    choices.push(buildChoice(contractPrice, n, riskBudget, comfortBudget, hardBudget));
  }

  // Recommendation: largest "fits" with practical exit room
  const fitsChoices = choices.filter((c) => c.status === "fits");
  const tightChoices = choices.filter((c) => c.status === "tight");
  let recommendedContracts = 0;

  if (fitsChoices.length > 0) {
    let recommended = fitsChoices[fitsChoices.length - 1];
    for (let i = fitsChoices.length - 1; i >= 0; i--) {
      const c = fitsChoices[i];
      if (c.fullPremiumRiskOk || c.maxCutRoom >= contractPrice * 0.2) {
        recommended = c;
        break;
      }
    }
    recommended.isRecommended = true;
    recommendedContracts = recommended.contracts;
  } else if (tightChoices.length > 0) {
    tightChoices[0].isRecommended = true;
    recommendedContracts = tightChoices[0].contracts;
  }

  return {
    choices,
    riskBudget,
    comfortBudget,
    hardBudget,
    accountLevel: tier,
    tradeLossLimit: riskBudget,
    comfortMax,
    hardMax,
    recommendedContracts,
    allPass: choices.every((c) => c.status === "pass"),
  };
}

/** Display-only formatting. Never feed back into engine math. */
export function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
