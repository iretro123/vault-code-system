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
