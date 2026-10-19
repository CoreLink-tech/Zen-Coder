/**
 * Synchronous workflow executor for Phase 9.
 * Runs steps in order using the shared tool registry.
 * Long-running / scheduled execution moves to workers in Phase 11.
 */

import { executeTool, getTool } from "@/lib/tools/registry";
import type { ToolContext } from "@/lib/tools/types";
import type { WorkflowDefinition } from "./types";
import { validateWorkflowDefinition } from "./types";

export interface StepLog {
  stepId: string;
  name: string;
  toolId: string;
  status: "succeeded" | "failed" | "skipped";
  startedAt: number;
  finishedAt: number;
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface ExecutionResult {
  status: "succeeded" | "failed";
  steps: StepLog[];
  error?: string;
}

export async function executeWorkflowDefinition(
  definitionRaw: unknown,
  ctx: ToolContext
): Promise<ExecutionResult> {
  const validated = validateWorkflowDefinition(definitionRaw);
  if (!validated.ok) {
    return { status: "failed", steps: [], error: validated.error };
  }

  const definition: WorkflowDefinition = validated.data;
  const logs: StepLog[] = [];

  for (const step of definition.steps) {
    const tool = getTool(step.toolId);
    if (!tool) {
      const log: StepLog = {
        stepId: step.id,
        name: step.name,
        toolId: step.toolId,
        status: "failed",
        startedAt: Date.now(),
        finishedAt: Date.now(),
        error: `Unknown tool: ${step.toolId}`,
      };
      logs.push(log);
      if (step.onFailure === "continue") continue;
      return { status: "failed", steps: logs, error: log.error };
    }

    const startedAt = Date.now();
    const result = await executeTool(step.toolId, step.input, {
      ...ctx,
      workspace: "automation",
    });
    const finishedAt = Date.now();

    if (!result.success) {
      const log: StepLog = {
        stepId: step.id,
        name: step.name,
        toolId: step.toolId,
        status: "failed",
        startedAt,
        finishedAt,
        input: step.input,
        error: result.error,
      };
      logs.push(log);
      if (step.onFailure === "continue") continue;
      return { status: "failed", steps: logs, error: result.error };
    }

    // Optional assertion for http_check: data.ok must be true if present
    if (
      step.toolId === "http_check" &&
      result.data &&
      typeof result.data === "object" &&
      "ok" in result.data &&
      (result.data as { ok: boolean }).ok === false
    ) {
      const log: StepLog = {
        stepId: step.id,
        name: step.name,
        toolId: step.toolId,
        status: "failed",
        startedAt,
        finishedAt,
        input: step.input,
        output: result.data,
        error: "HTTP check assertion failed (unexpected status)",
      };
      logs.push(log);
      if (step.onFailure === "continue") continue;
      return { status: "failed", steps: logs, error: log.error };
    }

    logs.push({
      stepId: step.id,
      name: step.name,
      toolId: step.toolId,
      status: "succeeded",
      startedAt,
      finishedAt,
      input: step.input,
      output: result.data,
    });
  }

  return { status: "succeeded", steps: logs };
}
