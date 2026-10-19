/**
 * Structured workflow definition (versioned JSON stored in workflow_versions).
 */

import { z } from "zod";

export const workflowStepSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  toolId: z.string().min(1).max(64),
  input: z.record(z.unknown()).default({}),
  /** Optional condition expression (future); empty = always run */
  condition: z.string().max(500).optional(),
  timeoutMs: z.number().int().positive().max(300_000).optional(),
  onFailure: z.enum(["abort", "continue"]).default("abort"),
});

export const workflowDefinitionSchema = z.object({
  version: z.literal(1),
  steps: z.array(workflowStepSchema).min(1).max(50),
});

export type WorkflowStep = z.infer<typeof workflowStepSchema>;
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

export function validateWorkflowDefinition(raw: unknown): {
  ok: true;
  data: WorkflowDefinition;
} | {
  ok: false;
  error: string;
} {
  const parsed = workflowDefinitionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  // Unique step ids
  const ids = new Set<string>();
  for (const step of parsed.data.steps) {
    if (ids.has(step.id)) {
      return { ok: false, error: `Duplicate step id: ${step.id}` };
    }
    ids.add(step.id);
  }

  return { ok: true, data: parsed.data };
}
