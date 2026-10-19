"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  workflowExecutions,
  workflowVersions,
  workflows,
} from "@/lib/db/schema";
import { validateWorkflowDefinition } from "./types";
import { executeWorkflowDefinition } from "./executor";
import { listTools } from "@/lib/tools/registry";

export async function listAutomationWorkflows() {
  const user = await requireUser();
  return db.query.workflows.findMany({
    where: eq(workflows.userId, user.id),
    orderBy: [desc(workflows.updatedAt)],
  });
}

export async function getAutomationWorkflow(id: string) {
  const user = await requireUser();
  return db.query.workflows.findFirst({
    where: and(eq(workflows.id, id), eq(workflows.userId, user.id)),
    with: {
      versions: {
        orderBy: (v, { desc: d }) => [d(v.version)],
      },
      executions: {
        orderBy: (e, { desc: d }) => [d(e.createdAt)],
        limit: 20,
      },
    },
  });
}

export async function listAutomationTools() {
  await requireUser();
  return listTools("automation").map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    risk: t.risk,
  }));
}

export async function createWorkflow(input: {
  name: string;
  description?: string;
  definition: unknown;
}) {
  const user = await requireUser();
  const name = input.name.trim();
  if (!name) return { success: false as const, error: "Name is required" };

  const validated = validateWorkflowDefinition(input.definition);
  if (!validated.ok) {
    return { success: false as const, error: validated.error };
  }

  // Ensure all tools exist in automation registry
  const autoTools = new Set(listTools("automation").map((t) => t.id));
  for (const step of validated.data.steps) {
    if (!autoTools.has(step.toolId)) {
      return {
        success: false as const,
        error: `Tool not allowed in automation: ${step.toolId}`,
      };
    }
  }

  const [workflow] = await db
    .insert(workflows)
    .values({
      userId: user.id,
      name,
      description: input.description?.trim() || null,
      status: "active",
    })
    .returning();

  const [version] = await db
    .insert(workflowVersions)
    .values({
      workflowId: workflow.id,
      version: 1,
      definition: JSON.stringify(validated.data),
      summary: `${validated.data.steps.length} step(s)`,
      createdBy: user.id,
    })
    .returning();

  await db
    .update(workflows)
    .set({ currentVersionId: version.id, updatedAt: new Date() })
    .where(eq(workflows.id, workflow.id));

  revalidatePath("/automation");
  return { success: true as const, workflowId: workflow.id };
}

export async function runWorkflow(workflowId: string) {
  const user = await requireUser();

  const workflow = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, workflowId),
      eq(workflows.userId, user.id)
    ),
  });

  if (!workflow) {
    return { success: false as const, error: "Workflow not found" };
  }
  if (workflow.status === "disabled" || workflow.status === "archived") {
    return { success: false as const, error: "Workflow is disabled" };
  }
  if (!workflow.currentVersionId) {
    return { success: false as const, error: "Workflow has no published version" };
  }

  const version = await db.query.workflowVersions.findFirst({
    where: eq(workflowVersions.id, workflow.currentVersionId),
  });
  if (!version) {
    return { success: false as const, error: "Workflow version missing" };
  }

  let definition: unknown;
  try {
    definition = JSON.parse(version.definition);
  } catch {
    return { success: false as const, error: "Invalid workflow definition JSON" };
  }

  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      workflowId: workflow.id,
      workflowVersionId: version.id,
      userId: user.id,
      status: "running",
      trigger: "manual",
      startedAt: new Date(),
    })
    .returning();

  const result = await executeWorkflowDefinition(definition, {
    userId: user.id,
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

  revalidatePath("/automation");
  revalidatePath(`/automation/${workflowId}`);

  return {
    success: result.status === "succeeded",
    executionId: execution.id,
    status: result.status,
    steps: result.steps,
    error: result.error,
  };
}

export async function setWorkflowStatus(
  workflowId: string,
  status: "active" | "paused" | "disabled"
) {
  const user = await requireUser();
  const result = await db
    .update(workflows)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)))
    .returning({ id: workflows.id });

  revalidatePath("/automation");
  return { success: result.length > 0 };
}

export async function deleteWorkflow(workflowId: string) {
  const user = await requireUser();
  const result = await db
    .delete(workflows)
    .where(and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)))
    .returning({ id: workflows.id });

  revalidatePath("/automation");
  return { success: result.length > 0 };
}
