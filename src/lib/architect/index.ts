/**
 * System Architect — model-independent planning via AI provider abstraction.
 * Approval is enforced server-side before protected implementation work.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { architecturePlans } from "@/lib/db/schema";
import { chat } from "@/lib/ai/chat";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { estimateCredits } from "@/lib/ai/chat";
import { deductUsage } from "@/lib/credits/ledger";
import { logger } from "@/lib/observability/logger";

export type PlanMode = "lightweight" | "full";

const LIGHTWEIGHT_SYSTEM = `You are the System Architect for Zen-Coder.
Produce a concise implementation plan as JSON with keys:
requirements, assumptions, approach, filesLikelyTouched (array), risks (array), acceptanceCriteria (array), estimatedComplexity (small|medium|large).
No markdown fences. Valid JSON only.`;

const FULL_SYSTEM = `You are the System Architect for Zen-Coder.
Produce a detailed architecture as JSON with keys:
requirements, assumptions, components (array of {name, responsibility}),
frontend, backend, apiContracts, database, auth, dataFlows,
repositoryStructure, externalServices, security, techChoices,
phases (array of {name, dependsOn, work}), testing, acceptanceCriteria,
failureModes, risks, estimatedCostNotes.
No markdown fences. Valid JSON only.`;

/** Heuristic: long or multi-step requests get full architecture. */
export function choosePlanMode(userMessage: string): PlanMode {
  const t = userMessage.trim();
  if (t.length > 400) return "full";
  const signals =
    /\b(build|create|architect|system|schema|api|database|auth|multi|dashboard|app|service|microservice|workflow)\b/i;
  if (signals.test(t) && t.length > 80) return "full";
  return "lightweight";
}

export function needsArchitectureGate(userMessage: string): boolean {
  const t = userMessage.trim();
  // Pure questions / tiny edits skip the gate
  if (t.length < 40) return false;
  if (/^(what|why|how|explain|summarize|list)\b/i.test(t) && t.length < 120)
    return false;
  return choosePlanMode(t) === "full" || t.length > 200;
}

export async function generateArchitecturePlan(input: {
  userId: string;
  conversationId: string;
  taskId?: string;
  userMessage: string;
  model?: string;
}): Promise<{
  planId: string;
  mode: PlanMode;
  content: string;
  status: "pending_approval";
  estimatedCredits: number;
}> {
  const mode = choosePlanMode(input.userMessage);
  const model = input.model ?? DEFAULT_MODEL_ID;
  const system = mode === "full" ? FULL_SYSTEM : LIGHTWEIGHT_SYSTEM;

  const result = await chat({
    model,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Task to plan:\n\n${input.userMessage}`,
      },
    ],
    temperature: 0.2,
    maxTokens: mode === "full" ? 4096 : 1500,
  });

  let content = result.content.trim();
  // Strip accidental fences
  content = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    JSON.parse(content);
  } catch {
    content = JSON.stringify({
      requirements: [input.userMessage],
      assumptions: [],
      approach: result.content,
      raw: true,
    });
  }

  const credits =
    (result.usage ? estimateCredits(model, result.usage) : null) ??
    (mode === "full" ? 50 : 15);

  if (credits > 0) {
    await deductUsage({
      userId: input.userId,
      amount: credits,
      operationId: `usage:architect:${input.conversationId}:${Date.now()}`,
      reason: "System Architect planning",
      taskId: input.taskId,
      provider: result.provider,
      model,
      metadata: { mode },
    }).catch((e) => logger.warn("architect_charge_failed", { error: String(e) }));
  }

  const [plan] = await db
    .insert(architecturePlans)
    .values({
      userId: input.userId,
      conversationId: input.conversationId,
      taskId: input.taskId,
      title: input.userMessage.slice(0, 120),
      mode,
      content,
      status: "pending_approval",
      model,
      provider: result.provider,
      creditsUsed: credits,
    })
    .returning();

  return {
    planId: plan.id,
    mode,
    content,
    status: "pending_approval",
    estimatedCredits: credits,
  };
}

export async function getLatestPlanForConversation(
  userId: string,
  conversationId: string
) {
  return db.query.architecturePlans.findFirst({
    where: and(
      eq(architecturePlans.userId, userId),
      eq(architecturePlans.conversationId, conversationId)
    ),
    orderBy: [desc(architecturePlans.createdAt)],
  });
}

export async function setPlanStatus(input: {
  userId: string;
  planId: string;
  status: "approved" | "rejected";
  feedback?: string;
}) {
  const existing = await db.query.architecturePlans.findFirst({
    where: and(
      eq(architecturePlans.id, input.planId),
      eq(architecturePlans.userId, input.userId)
    ),
  });
  if (!existing) return { success: false as const, error: "Plan not found" };
  if (existing.status !== "pending_approval" && existing.status !== "draft") {
    return { success: false as const, error: "Plan is not awaiting approval" };
  }

  await db
    .update(architecturePlans)
    .set({
      status: input.status,
      userFeedback: input.feedback ?? null,
      updatedAt: new Date(),
    })
    .where(eq(architecturePlans.id, input.planId));

  return { success: true as const };
}

/** Server gate: true only if latest full-mode plan is approved (or no gate needed). */
export async function isImplementationAllowed(
  userId: string,
  conversationId: string,
  userMessage: string
): Promise<{ allowed: boolean; reason?: string; planId?: string }> {
  if (!needsArchitectureGate(userMessage)) {
    return { allowed: true };
  }
  const plan = await getLatestPlanForConversation(userId, conversationId);
  if (!plan) {
    return {
      allowed: false,
      reason: "Architecture plan required before implementation",
    };
  }
  if (plan.status === "approved") {
    return { allowed: true, planId: plan.id };
  }
  if (plan.status === "pending_approval") {
    return {
      allowed: false,
      reason: "Approve or reject the architecture plan before continuing",
      planId: plan.id,
    };
  }
  return {
    allowed: false,
    reason: "A new architecture plan is required",
    planId: plan.id,
  };
}
