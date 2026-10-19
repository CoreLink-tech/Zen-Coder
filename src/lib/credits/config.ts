/**
 * Credit conversion configuration.
 *
 * 1,000 internal credits = $1.00 of metered AI provider cost (reference rate).
 * Versioned so pricing policy can change without rewriting callers.
 */

export const CREDIT_CONFIG = {
  /** Internal credits per USD of provider cost */
  creditsPerUsd: 1000,
  /** Config version for audit trails */
  version: "v1",
  /** Do not allow balance to go negative */
  allowNegative: false,
  /** Welcome grant for new accounts (credits) */
  welcomeGrantCredits: 5_000,
} as const;

export function usdToCredits(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.ceil(usd * CREDIT_CONFIG.creditsPerUsd);
}

export function creditsToUsd(credits: number): number {
  return credits / CREDIT_CONFIG.creditsPerUsd;
}
