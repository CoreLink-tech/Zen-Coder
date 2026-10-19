/**
 * Background job enqueue + process for scheduled workflow runs.
 * Triggered by /api/cron/process-jobs (Vercel Cron or external scheduler).
 */

import { and, eq, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  backgroundJobs,
  workflowExecutions,
  workflowSchedules,
  workflowVersions,
  workflows,
} from "@/lib/db/schema";
import { executeWorkflowDefinition } from "./executor";
import { computeNextRunAt } from "./schedule";
import { getAccountSummary, deductUsage } from "@/lib/credits";

const SCHEDULED_RUN_CREDITS = 10; // flat fee per scheduled run (v1)

export async function enqueueWorkflowJob(params: {
  userId: string;
  workflowId: string;
  scheduleId?: string;
  runAt?: Date;
}) {
  const [job] = await db
    .insert(backgroundJobs)
    .values({
      userId: params.userId,
      type: "workflow_run",
      payload: JSON.stringify({
        workflowId: params.workflowId,
        scheduleId: params.scheduleId,
      }),
      status: "pending",
      runAt: params.runAt ?? new Date(),
    })
    .returning();
  return job;
}

/**
 * Claim due jobs and execute them. Safe for concurrent callers via status flip.
 */
export async function processDueJobs(limit = 10): Promise<{
  processed: number;
  results: Array<{ jobId: string; ok: boolean; error?: string }>;
}> {
  const now = new Date();
  const due = await db.query.backgroundJobs.findMany({
    where: and(
      eq(backgroundJobs.status, "pending"),
      lte(backgroundJobs.runAt, now)
    ),
    limit,
  });

  const results: Array<{ jobId: string; ok: boolean; error?: string }> = [];

  for (const job of due) {
    // Claim
    const claimed = await db
      .update(backgroundJobs)
      .set({
        status: "running",
        lockedAt: now,
        attempts: sql`${backgroundJobs.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(backgroundJobs.id, job.id),
          eq(backgroundJobs.status, "pending")
        )
      )
      .returning({ id: backgroundJobs.id });

    if (claimed.length === 0) continue; // another worker took it

    try {
      const outcome = await runWorkflowJob(job);
      await db
        .update(backgroundJobs)
        .set({
          status: outcome.ok ? "succeeded" : "failed",
          result: JSON.stringify(outcome),
          error: outcome.error ?? null,
          updatedAt: new Date(),
        })
        .where(eq(backgroundJobs.id, job.id));
      results.push({ jobId: job.id, ok: outcome.ok, error: outcome.error });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Job failed";
      const attempts = (job.attempts ?? 0) + 1;
      const shouldRetry = attempts < (job.maxAttempts ?? 3);
      await db
        .update(backgroundJobs)
        .set({
          status: shouldRetry ? "pending" : "failed",
          error: message,
          runAt: shouldRetry
            ? new Date(Date.now() + attempts * 60_000)
            : job.runAt,
          updatedAt: new Date(),
        })
        .where(eq(backgroundJobs.id, job.id));
      results.push({ jobId: job.id, ok: false, error: message });
    }
  }

  return { processed: results.length, results };
}

async function runWorkflowJob(job: {
  id: string;
  userId: string;
  payload: string;
}): Promise<{ ok: boolean; error?: string; executionId?: string }> {
  let payload: { workflowId: string; scheduleId?: string };
  try {
    payload = JSON.parse(job.payload);
  } catch {
    return { ok: false, error: "Invalid job payload" };
  }

  const workflow = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, payload.workflowId),
      eq(workflows.userId, job.userId)
    ),
  });
  if (!workflow) return { ok: false, error: "Workflow not found" };
  if (workflow.status !== "active") {
    return { ok: false, error: `Workflow status is ${workflow.status}` };
  }
  if (!workflow.currentVersionId) {
    return { ok: false, error: "No published version" };
  }

  // Overlap prevention
  if (payload.scheduleId) {
    const schedule = await db.query.workflowSchedules.findFirst({
      where: eq(workflowSchedules.id, payload.scheduleId),
    });
    if (schedule?.preventOverlap) {
      const running = await db.query.workflowExecutions.findFirst({
        where: and(
          eq(workflowExecutions.workflowId, workflow.id),
          eq(workflowExecutions.status, "running")
        ),
      });
      if (running) {
        return { ok: false, error: "Overlap prevented: execution already running" };
      }
    }
  }

  // Credit check
  const summary = await getAccountSummary(job.userId);
  if (summary.available < SCHEDULED_RUN_CREDITS) {
    return {
      ok: false,
      error: `Insufficient credits (need ${SCHEDULED_RUN_CREDITS}, available ${summary.available})`,
    };
  }

  const version = await db.query.workflowVersions.findFirst({
    where: eq(workflowVersions.id, workflow.currentVersionId),
  });
  if (!version) return { ok: false, error: "Version missing" };

  let definition: unknown;
  try {
    definition = JSON.parse(version.definition);
  } catch {
    return { ok: false, error: "Invalid definition JSON" };
  }

  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      workflowId: workflow.id,
      workflowVersionId: version.id,
      userId: job.userId,
      status: "running",
      trigger: "schedule",
      startedAt: new Date(),
    })
    .returning();

  const result = await executeWorkflowDefinition(definition, {
    userId: job.userId,
    workspace: "automation",
  });

  await db
    .update(workflowExecutions)
    .set({
      status: result.status === "succeeded" ? "succeeded" : "failed",
      finishedAt: new Date(),
      error: result.error ?? null,
      logs: JSON.stringify(result.steps),
      updatedAt: new Date(),
    })
    .where(eq(workflowExecutions.id, execution.id));

  // Charge credits (idempotent per job)
  try {
    await deductUsage({
      userId: job.userId,
      amount: SCHEDULED_RUN_CREDITS,
      operationId: `usage:job:${job.id}`,
      reason: "Scheduled workflow run",
      workflowExecutionId: execution.id,
      metadata: { workflowId: workflow.id },
    });
  } catch {
    // Don't fail the job if charge races; usage already recorded or insufficient
  }

  // Advance schedule
  if (payload.scheduleId) {
    const schedule = await db.query.workflowSchedules.findFirst({
      where: eq(workflowSchedules.id, payload.scheduleId),
    });
    if (schedule?.enabled) {
      try {
        const next = computeNextRunAt(
          schedule.type as "interval" | "cron",
          schedule.expression
        );
        await db
          .update(workflowSchedules)
          .set({
            lastRunAt: new Date(),
            nextRunAt: next,
            updatedAt: new Date(),
          })
          .where(eq(workflowSchedules.id, schedule.id));
        await enqueueWorkflowJob({
          userId: job.userId,
          workflowId: workflow.id,
          scheduleId: schedule.id,
          runAt: next,
        });
      } catch {
        // leave schedule without next if expression broken
      }
    }
  }

  return {
    ok: result.status === "succeeded",
    error: result.error,
    executionId: execution.id,
  };
}

/**
 * Find enabled schedules that are due and enqueue jobs if none pending.
 */
export async function enqueueDueSchedules(): Promise<number> {
  const now = new Date();
  const due = await db.query.workflowSchedules.findMany({
    where: and(
      eq(workflowSchedules.enabled, true),
      or(
        lte(workflowSchedules.nextRunAt, now),
        sql`${workflowSchedules.nextRunAt} IS NULL`
      )
    ),
    limit: 50,
  });

  let enqueued = 0;
  for (const schedule of due) {
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, schedule.workflowId),
        eq(workflows.status, "active")
      ),
    });
    if (!workflow) continue;

    // Skip if a pending/running job already exists for this schedule
    const existingJobs = await db.query.backgroundJobs.findMany({
      where: and(
        eq(backgroundJobs.userId, schedule.userId),
        eq(backgroundJobs.type, "workflow_run"),
        or(
          eq(backgroundJobs.status, "pending"),
          eq(backgroundJobs.status, "running")
        )
      ),
      limit: 50,
    });
    const hasPending = existingJobs.some((job) => {
      try {
        const payload = JSON.parse(job.payload) as { scheduleId?: string };
        return payload.scheduleId === schedule.id;
      } catch {
        return false;
      }
    });
    if (hasPending) continue;

    const runAt = schedule.nextRunAt && schedule.nextRunAt > now
      ? schedule.nextRunAt
      : now;

    await enqueueWorkflowJob({
      userId: schedule.userId,
      workflowId: schedule.workflowId,
      scheduleId: schedule.id,
      runAt,
    });

    // Ensure nextRunAt is set
    if (!schedule.nextRunAt) {
      try {
        const next = computeNextRunAt(
          schedule.type as "interval" | "cron",
          schedule.expression,
          now
        );
        await db
          .update(workflowSchedules)
          .set({ nextRunAt: next, updatedAt: new Date() })
          .where(eq(workflowSchedules.id, schedule.id));
      } catch {
        /* ignore */
      }
    }

    enqueued++;
  }
  return enqueued;
}
