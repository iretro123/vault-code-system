/**
 * Vault OS — Fixed Market Constants
 *
 * These represent real options-market constraints enforced by the system.
 * They are NOT user-editable. All enforcement flows must reference this file
 * as the single source of truth for structural trading limits.
 */

/** Minimum viable contract size to enter a trade */
export const MIN_VIABLE_CONTRACT = 20;

/** Default / target contract size for standard entries */
export const TARGET_CONTRACT = 30;

/** Absolute maximum contract size allowed per trade */
export const MAX_CONTRACT = 50;

/** Maximum losing trades allowed per day before lockout */
export const MAX_LOSSES_PER_DAY = 2;

/** Maximum number of simultaneously open trades */
export const MAX_OPEN_TRADES = 1;

/**
 * Risk-mode daily-risk percentages.
 * These are the ONLY multipliers used to derive daily risk from account balance.
 */
export const RISK_MODE_DAILY_PERCENT: Record<string, number> = {
  CONSERVATIVE: 0.01, // 1%
  STANDARD: 0.02,     // 2%
  AGGRESSIVE: 0.03,   // 3%
};

// ─── Derived Limit Types ─────────────────────────────────────────────

export interface VaultLimits {
  /** Clamped risk per trade after options-reality constraints */
  risk_per_trade: number;
  /** risk_per_trade × MAX_LOSSES_PER_DAY */
  daily_loss_limit: number;
  /** Always MAX_LOSSES_PER_DAY */
  max_trades_per_day: number;
  /** floor(risk_per_trade / TARGET_CONTRACT) — minimum 1 */
  max_contracts: number;
}

// ─── The ONE canonical risk engine ───────────────────────────────────

/**
 * Computes all Vault enforcement limits from account balance and risk mode.
 *
 * This is the ONLY place where Vault OS math exists.
 * No other file, hook, component, or RPC should duplicate this logic.
 */
export function computeVaultLimits(
  account_balance: number,
  risk_mode: string,
): VaultLimits {
  const dailyPercent = RISK_MODE_DAILY_PERCENT[risk_mode] ?? RISK_MODE_DAILY_PERCENT.STANDARD;

  // Step 1 — Raw daily risk
  const raw_daily_risk = account_balance * dailyPercent;

  // Step 2 — Raw risk per trade
  const raw_risk_per_trade = raw_daily_risk / MAX_LOSSES_PER_DAY;

  // Step 3 — Apply options-reality constraints
  //   Start from whichever is larger: the raw value or the target contract price
  //   Then clamp into the viable range [MIN, MAX]
  const risk_per_trade = Math.min(
    Math.max(
      Math.max(raw_risk_per_trade, TARGET_CONTRACT),
      MIN_VIABLE_CONTRACT,
    ),
    MAX_CONTRACT,
  );

  // Step 4 — Derive enforcement values
  const daily_loss_limit = risk_per_trade * MAX_LOSSES_PER_DAY;
  const max_trades_per_day = MAX_LOSSES_PER_DAY;
  const max_contracts = Math.max(1, Math.floor(risk_per_trade / TARGET_CONTRACT));

  return {
    risk_per_trade,
    daily_loss_limit,
    max_trades_per_day,
    max_contracts,
  };
}

// ─── Viability Resolution ────────────────────────────────────────────

export interface ResolvedRiskMode {
  /** The mode that will actually be applied */
  applied_mode: string;
  /** Whether the requested mode was overridden */
  was_overridden: boolean;
  /** System message to display if overridden (null if not) */
  system_message: string | null;
  /** The computed limits for the applied mode */
  limits: VaultLimits;
}

/**
 * Resolves the effective risk mode for a given account balance.
 *
 * If CONSERVATIVE produces risk_per_trade < MIN_VIABLE_CONTRACT,
 * STANDARD is applied automatically. The user may not override this.
 */
export function resolveViableRiskMode(
  account_balance: number,
  requested_mode: string,
): ResolvedRiskMode {
  if (requested_mode === "CONSERVATIVE") {
    const rawDaily = account_balance * (RISK_MODE_DAILY_PERCENT.CONSERVATIVE ?? 0.01);
    const rawPerTrade = rawDaily / MAX_LOSSES_PER_DAY;

    if (rawPerTrade < MIN_VIABLE_CONTRACT) {
      const limits = computeVaultLimits(account_balance, "STANDARD");
      return {
        applied_mode: "STANDARD",
        was_overridden: true,
        system_message:
          "Conservative mode is not viable for your account size. Vault OS applied Standard mode to allow safe participation.",
        limits,
      };
    }
  }

  const limits = computeVaultLimits(account_balance, requested_mode);
  return {
    applied_mode: requested_mode,
    was_overridden: false,
    system_message: null,
    limits,
  };
}
