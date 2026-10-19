/**
 * Unified credit ledger — single shared balance for Coding + Automation.
 *
 * Design:
 * - All mutations go through this module
 * - Every entry has a unique operationId (idempotency)
 * - Available = balance - reserved
 * - Negative balances are not allowed (configurable)
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  creditAccounts,
  creditLedgerEntries,
  type CreditAccount,
  type CreditLedgerEntry,
} from "@/lib/db/schema";
import { CREDIT_CONFIG } from "./config";

export class InsufficientCreditsError extends Error {
  readonly available: number;
  readonly required: number;

  constructor(available: number, required: number) {
    super(
      `Insufficient credits: available ${available}, required ${required}`
    );
    this.name = "InsufficientCreditsError";
    this.available = available;
    this.required = required;
  }
}

export class IdempotentReplayError extends Error {
  readonly entry: CreditLedgerEntry;

  constructor(entry: CreditLedgerEntry) {
    super(`Operation already applied: ${entry.operationId}`);
    this.name = "IdempotentReplayError";
    this.entry = entry;
  }
}

async function getOrCreateAccount(userId: string): Promise<CreditAccount> {
  const existing = await db.query.creditAccounts.findFirst({
    where: eq(creditAccounts.userId, userId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(creditAccounts)
    .values({ userId, balance: 0, reserved: 0 })
    .returning();
  return created;
}

export async function getAccountSummary(userId: string) {
  const account = await getOrCreateAccount(userId);
  return {
    balance: account.balance,
    reserved: account.reserved,
    available: account.balance - account.reserved,
    accountId: account.id,
  };
}

export async function listLedgerEntries(userId: string, limit = 50) {
  return db.query.creditLedgerEntries.findMany({
    where: eq(creditLedgerEntries.userId, userId),
    orderBy: (e, { desc }) => [desc(e.createdAt)],
    limit,
  });
}

type LedgerType = CreditLedgerEntry["type"];

interface LedgerWriteParams {
  userId: string;
  amount: number; // signed: + credit, - debit
  type: LedgerType;
  operationId: string;
  reason?: string;
  taskId?: string;
  workflowExecutionId?: string;
  provider?: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Core write: insert ledger entry + update balance atomically when possible.
 * Idempotent on operationId.
 */
async function writeLedgerEntry(
  params: LedgerWriteParams
): Promise<{ account: CreditAccount; entry: CreditLedgerEntry }> {
  // Idempotency check
  const existing = await db.query.creditLedgerEntries.findFirst({
    where: eq(creditLedgerEntries.operationId, params.operationId),
  });
  if (existing) {
    const account = await getOrCreateAccount(params.userId);
    throw new IdempotentReplayError(existing);
  }

  const account = await getOrCreateAccount(params.userId);

  // For usage/debits, ensure available funds
  if (params.amount < 0 && !CREDIT_CONFIG.allowNegative) {
    const available = account.balance - account.reserved;
    if (available + params.amount < 0) {
      // amount is negative; available + amount < 0 means insufficient
      throw new InsufficientCreditsError(available, Math.abs(params.amount));
    }
  }

  const [entry] = await db
    .insert(creditLedgerEntries)
    .values({
      accountId: account.id,
      userId: params.userId,
      amount: params.amount,
      type: params.type,
      operationId: params.operationId,
      reason: params.reason,
      taskId: params.taskId,
      workflowExecutionId: params.workflowExecutionId,
      provider: params.provider,
      model: params.model,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    })
    .returning();

  // Update balance (grants/purchases/usage/refunds/adjustments affect balance)
  // Reservations affect reserved, not balance (handled separately)
  if (
    params.type === "grant" ||
    params.type === "purchase" ||
    params.type === "usage" ||
    params.type === "refund" ||
    params.type === "adjustment" ||
    params.type === "reconciliation"
  ) {
    const [updated] = await db
      .update(creditAccounts)
      .set({
        balance: sql`${creditAccounts.balance} + ${params.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.id, account.id))
      .returning();
    return { account: updated, entry };
  }

  return { account, entry };
}

/** Grant credits (signup bonus, promo, admin) */
export async function grantCredits(params: {
  userId: string;
  amount: number;
  operationId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  if (params.amount <= 0) throw new Error("Grant amount must be positive");
  return writeLedgerEntry({
    userId: params.userId,
    amount: params.amount,
    type: "grant",
    operationId: params.operationId,
    reason: params.reason ?? "Credit grant",
    metadata: params.metadata,
  });
}

/** Record a purchase (amount in credits already converted) */
export async function recordPurchase(params: {
  userId: string;
  amount: number;
  operationId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  if (params.amount <= 0) throw new Error("Purchase amount must be positive");
  return writeLedgerEntry({
    userId: params.userId,
    amount: params.amount,
    type: "purchase",
    operationId: params.operationId,
    reason: params.reason ?? "Purchase",
    metadata: params.metadata,
  });
}

/** Deduct usage (AI call). amount should be positive credits to charge. */
export async function deductUsage(params: {
  userId: string;
  amount: number;
  operationId: string;
  reason?: string;
  taskId?: string;
  workflowExecutionId?: string;
  provider?: string;
  model?: string;
  metadata?: Record<string, unknown>;
}) {
  if (params.amount <= 0) throw new Error("Usage amount must be positive");
  return writeLedgerEntry({
    userId: params.userId,
    amount: -params.amount,
    type: "usage",
    operationId: params.operationId,
    reason: params.reason ?? "AI usage",
    taskId: params.taskId,
    workflowExecutionId: params.workflowExecutionId,
    provider: params.provider,
    model: params.model,
    metadata: params.metadata,
  });
}

/** Refund credits */
export async function refundCredits(params: {
  userId: string;
  amount: number;
  operationId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  if (params.amount <= 0) throw new Error("Refund amount must be positive");
  return writeLedgerEntry({
    userId: params.userId,
    amount: params.amount,
    type: "refund",
    operationId: params.operationId,
    reason: params.reason ?? "Refund",
    metadata: params.metadata,
  });
}

/**
 * Reserve credits for an in-flight operation.
 * Increases `reserved` without changing `balance`.
 */
export async function reserveCredits(params: {
  userId: string;
  amount: number;
  operationId: string;
  reason?: string;
}) {
  if (params.amount <= 0) throw new Error("Reserve amount must be positive");

  const existing = await db.query.creditLedgerEntries.findFirst({
    where: eq(creditLedgerEntries.operationId, params.operationId),
  });
  if (existing) {
    const account = await getOrCreateAccount(params.userId);
    return { account, entry: existing, replayed: true as const };
  }

  const account = await getOrCreateAccount(params.userId);
  const available = account.balance - account.reserved;
  if (available < params.amount && !CREDIT_CONFIG.allowNegative) {
    throw new InsufficientCreditsError(available, params.amount);
  }

  const [entry] = await db
    .insert(creditLedgerEntries)
    .values({
      accountId: account.id,
      userId: params.userId,
      amount: -params.amount, // informational; balance unchanged
      type: "reservation",
      operationId: params.operationId,
      reason: params.reason ?? "Reservation",
    })
    .returning();

  const [updated] = await db
    .update(creditAccounts)
    .set({
      reserved: sql`${creditAccounts.reserved} + ${params.amount}`,
      updatedAt: new Date(),
    })
    .where(eq(creditAccounts.id, account.id))
    .returning();

  return { account: updated, entry, replayed: false as const };
}

/**
 * Release a reservation (partial or full) without charging.
 * operationId should be unique for this release.
 */
export async function releaseReservation(params: {
  userId: string;
  amount: number;
  operationId: string;
  reason?: string;
}) {
  if (params.amount <= 0) throw new Error("Release amount must be positive");

  const existing = await db.query.creditLedgerEntries.findFirst({
    where: eq(creditLedgerEntries.operationId, params.operationId),
  });
  if (existing) {
    const account = await getOrCreateAccount(params.userId);
    return { account, entry: existing, replayed: true as const };
  }

  const account = await getOrCreateAccount(params.userId);
  const releaseAmount = Math.min(params.amount, account.reserved);

  const [entry] = await db
    .insert(creditLedgerEntries)
    .values({
      accountId: account.id,
      userId: params.userId,
      amount: releaseAmount, // informational
      type: "release",
      operationId: params.operationId,
      reason: params.reason ?? "Release reservation",
    })
    .returning();

  const [updated] = await db
    .update(creditAccounts)
    .set({
      reserved: sql`MAX(0, ${creditAccounts.reserved} - ${releaseAmount})`,
      updatedAt: new Date(),
    })
    .where(eq(creditAccounts.id, account.id))
    .returning();

  return { account: updated, entry, replayed: false as const };
}

/**
 * Welcome grant for newly registered users (idempotent per user).
 */
export async function ensureWelcomeGrant(userId: string) {
  const operationId = `welcome-grant:${userId}`;
  try {
    return await grantCredits({
      userId,
      amount: CREDIT_CONFIG.welcomeGrantCredits,
      operationId,
      reason: "Welcome grant",
      metadata: { version: CREDIT_CONFIG.version },
    });
  } catch (err) {
    if (err instanceof IdempotentReplayError) {
      return { account: await getOrCreateAccount(userId), entry: err.entry };
    }
    throw err;
  }
}
