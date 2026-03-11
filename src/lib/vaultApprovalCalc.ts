/**
 * VAULT Approval — Contract Choice Engine
 * Calculates 1/2/3/4 contract choices with Fits/Tight/Pass status
 */

import { detectTier, TIER_DEFAULTS, type AccountTierLabel } from "./tradePlannerCalc";

export type ApprovalStatus = "fits" | "tight" | "pass";

export interface ContractChoice {
  contracts: number;
  cashNeeded: number;
  maxCutRoom: number;
  /** null = full premium risk is acceptable */
  suggestedExit: number | null;
  worstCaseLoss: number;
  fullPremiumRiskOk: boolean;
  tp1: number;
  tp2: number;
  tp3: number;
  r: number;
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
  allPass: boolean;
}

export function calculateContractChoices(
  accountSize: number,
  entryPremium: number,
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

  const choices: ContractChoice[] = [];

  for (let n = 1; n <= 4; n++) {
    const cashNeeded = entryPremium * 100 * n;
    const maxCutRoom = riskBudget / (100 * n);
    const fullPremiumRiskOk = maxCutRoom >= entryPremium;

    let suggestedExit: number | null;
    let worstCaseLoss: number;

    if (fullPremiumRiskOk) {
      // Full premium risk is within budget — no exit needed
      suggestedExit = null;
      worstCaseLoss = cashNeeded;
    } else {
      suggestedExit = Math.max(0.01, Math.ceil((entryPremium - maxCutRoom) * 100) / 100);
      worstCaseLoss = (entryPremium - suggestedExit) * 100 * n;
    }

    // Status
    let status: ApprovalStatus;
    if (cashNeeded <= comfortBudget && worstCaseLoss <= riskBudget) {
      status = "fits";
    } else if (cashNeeded <= hardBudget && worstCaseLoss <= riskBudget) {
      status = "tight";
    } else {
      status = "pass";
    }

    // Targets: R = distance from entry to exit
    const r = suggestedExit !== null ? entryPremium - suggestedExit : entryPremium;
    const tp1 = Math.round((entryPremium + r) * 100) / 100;
    const tp2 = Math.round((entryPremium + 2 * r) * 100) / 100;

    // Coaching note
    let coachingNote: string;
    if (status === "fits") {
      coachingNote = "Fits your account.";
    } else if (status === "tight") {
      coachingNote = "Works, but your exit has to be tight.";
    } else {
      coachingNote = "Too expensive for this account.";
    }
    if (fullPremiumRiskOk && status !== "pass") {
      coachingNote += " Full premium risk is covered by your risk budget.";
    }

    choices.push({
      contracts: n,
      cashNeeded,
      maxCutRoom,
      suggestedExit,
      worstCaseLoss,
      fullPremiumRiskOk,
      tp1,
      tp2,
      status,
      coachingNote,
      isRecommended: false,
    });
  }

  // Mark recommended: largest "fits", else largest "tight"
  const fitsChoices = choices.filter((c) => c.status === "fits");
  const tightChoices = choices.filter((c) => c.status === "tight");

  if (fitsChoices.length > 0) {
    fitsChoices[fitsChoices.length - 1].isRecommended = true;
  } else if (tightChoices.length > 0) {
    tightChoices[tightChoices.length - 1].isRecommended = true;
  }

  return {
    choices,
    riskBudget,
    comfortBudget,
    hardBudget,
    accountLevel: tier,
    tradeLossLimit: riskBudget,
    allPass: choices.every((c) => c.status === "pass"),
  };
}

export function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
