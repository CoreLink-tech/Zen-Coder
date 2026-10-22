/**
 * Multi-Model Debugger — opt-in only after coding task completion.
 * Declining must not call providers or charge credits.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { debuggerRuns } from "@/lib/db/schema";
import { chat } from "@/lib/ai/chat";
import { listConfiguredProviders } from "@/lib/ai";
import { DEFAULT_MODEL_ID, MODEL_REGISTRY } from "@/lib/ai/models";
import { estimateCredits } from "@/lib/ai/chat";
import { deductUsage } from "@/lib/credits/ledger";
import { logger } from "@/lib/observability/logger";

export async function offerDebugger(input: {
  userId: string;
  conversationId: string;
  taskId: string;
}) {
  const [run] = await db
    .insert(debuggerRuns)
    .values({
      userId: input.userId,
      conversationId: input.conversationId,
      taskId: input.taskId,
      status: "offered",
    })
    .returning();
  return run;
}

export async function declineDebugger(userId: string, runId: string) {
  const run = await db.query.debuggerRuns.findFirst({
    where: and(eq(debuggerRuns.id, runId), eq(debuggerRuns.userId, userId)),
  });
  if (!run || run.status !== "offered") {
    return { success: false as const, error: "Offer not available" };
  }
  await db
    .update(debuggerRuns)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(debuggerRuns.id, runId));
  // Explicitly: no provider calls, no charges
  return { success: true as const };
}

function pickDistinctModels(): string[] {
  const configured = listConfiguredProviders();
  const ids = new Set(configured.flatMap((p) => p.listModels().map((m) => m.id)));
  const preferred = MODEL_REGISTRY.map((m) => m.id).filter((id) => ids.has(id));
  // Prefer diverse providers
  const picked: string[] = [];
  const providersSeen = new Set<string>();
  for (const id of preferred) {
    const meta = MODEL_REGISTRY.find((m) => m.id === id);
    const prov = meta?.provider ?? "unknown";
    if (!providersSeen.has(prov)) {
      picked.push(id);
      providersSeen.add(prov);
    }
    if (picked.length >= 3) break;
  }
  if (picked.length === 0 && ids.size > 0) {
    picked.push([...ids][0]!);
  }
  if (picked.length === 0) picked.push(DEFAULT_MODEL_ID);
  return picked;
}

export async function runMultiModelDebugger(input: {
  userId: string;
  runId: string;
  context: {
    architectureJson?: string;
    assistantSummary: string;
    changedFilesNote?: string;
  };
}) {
  const run = await db.query.debuggerRuns.findFirst({
    where: and(
      eq(debuggerRuns.id, input.runId),
      eq(debuggerRuns.userId, input.userId)
    ),
  });
  if (!run || (run.status !== "offered" && run.status !== "failed")) {
    return { success: false as const, error: "Debugger not available for this run" };
  }

  const models = pickDistinctModels();
  const multi = models.length > 1;

  await db
    .update(debuggerRuns)
    .set({ status: "running", modelsUsed: JSON.stringify(models), updatedAt: new Date() })
    .where(eq(debuggerRuns.id, input.runId));

  const reviews: Array<{ model: string; text: string; credits: number }> = [];
  let totalCredits = 0;

  try {
    for (const model of models) {
      const prompt = `You are an independent code reviewer (model: ${model}).
Review the following coding-task outcome. Identify potential defects, security issues, and missing tests.
Respond with JSON: { confirmed: string[], suspected: string[], confidence: number, recommendedFix: string, evidence: string[] }.

Architecture (may be empty):
${input.context.architectureJson ?? "(none)"}

Summary of work:
${input.context.assistantSummary}

Changed files note:
${input.context.changedFilesNote ?? "(none)"}`;

      const result = await chat({
        model,
        messages: [
          { role: "system", content: "Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        maxTokens: 2000,
      });
      const credits =
        (result.usage ? estimateCredits(model, result.usage) : null) ?? 25;
      totalCredits += credits;
      reviews.push({ model, text: result.content, credits });

      await deductUsage({
        userId: input.userId,
        amount: credits,
        operationId: `usage:debugger:${input.runId}:${model}`,
        reason: "Multi-Model Debugger review",
        taskId: run.taskId ?? undefined,
        provider: result.provider,
        model,
        metadata: { debuggerRunId: input.runId },
      }).catch((e) => logger.warn("debugger_charge_failed", { error: String(e) }));
    }

    const findings = JSON.stringify({
      multiProvider: multi,
      note: multi
        ? "Reviews from distinct provider/model configurations"
        : "Only one provider configured — single-model diagnostic",
      reviews,
    });

    await db
      .update(debuggerRuns)
      .set({
        status: "completed",
        findings,
        creditsUsed: totalCredits,
        updatedAt: new Date(),
      })
      .where(eq(debuggerRuns.id, input.runId));

    return {
      success: true as const,
      findings,
      models,
      multiProvider: multi,
      creditsUsed: totalCredits,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Debugger failed";
    await db
      .update(debuggerRuns)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(debuggerRuns.id, input.runId));
    return { success: false as const, error: message };
  }
}
