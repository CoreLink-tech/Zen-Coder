"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { workflowSchedules, workflows } from "@/lib/db/schema";
import { computeNextRunAt, parseScheduleInput } from "./schedule";
import { enqueueWorkflowJob } from "./jobs";

export async function listSchedulesForWorkflow(workflowId: string) {
  const user = await requireUser();
  return db.query.workflowSchedules.findMany({
    where: and(
      eq(workflowSchedules.workflowId, workflowId),
      eq(workflowSchedules.userId, user.id)
    ),
  });
}

export async function upsertSchedule(input: {
  workflowId: string;
  type: "interval" | "cron";
  expression: string;
  enabled?: boolean;
  preventOverlap?: boolean;
}) {
  const user = await requireUser();

  const workflow = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, input.workflowId),
      eq(workflows.userId, user.id)
    ),
  });
  if (!workflow) {
    return { success: false as const, error: "Workflow not found" };
  }

  let parsed: { type: "interval" | "cron"; expression: string };
  try {
    parsed = parseScheduleInput({
      type: input.type,
      expression: input.expression,
    });
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Invalid schedule",
    };
  }

  let nextRunAt: Date;
  try {
    nextRunAt = computeNextRunAt(parsed.type, parsed.expression);
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Could not compute next run",
    };
  }

  const existing = await db.query.workflowSchedules.findFirst({
    where: and(
      eq(workflowSchedules.workflowId, input.workflowId),
      eq(workflowSchedules.userId, user.id)
    ),
  });

  if (existing) {
    await db
      .update(workflowSchedules)
      .set({
        type: parsed.type,
        expression: parsed.expression,
        enabled: input.enabled ?? true,
        preventOverlap: input.preventOverlap ?? true,
        nextRunAt,
        updatedAt: new Date(),
      })
      .where(eq(workflowSchedules.id, existing.id));

    if (input.enabled !== false) {
      await enqueueWorkflowJob({
        userId: user.id,
        workflowId: input.workflowId,
        scheduleId: existing.id,
        runAt: nextRunAt,
      });
    }
  } else {
    const [created] = await db
      .insert(workflowSchedules)
      .values({
        workflowId: input.workflowId,
        userId: user.id,
        type: parsed.type,
        expression: parsed.expression,
        enabled: input.enabled ?? true,
        preventOverlap: input.preventOverlap ?? true,
        nextRunAt,
      })
      .returning();

    if (input.enabled !== false) {
      await enqueueWorkflowJob({
        userId: user.id,
        workflowId: input.workflowId,
        scheduleId: created.id,
        runAt: nextRunAt,
      });
    }
  }

  revalidatePath(`/automation/${input.workflowId}`);
  return { success: true as const, nextRunAt: nextRunAt.toISOString() };
}

export async function disableSchedule(workflowId: string) {
  const user = await requireUser();
  await db
    .update(workflowSchedules)
    .set({ enabled: false, updatedAt: new Date() })
    .where(
      and(
        eq(workflowSchedules.workflowId, workflowId),
        eq(workflowSchedules.userId, user.id)
      )
    );
  revalidatePath(`/automation/${workflowId}`);
  return { success: true as const };
}
