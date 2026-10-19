/**
 * Shared tool framework types.
 * Used by both Coding and Automation agents.
 */

import { z } from "zod";

export type ToolRisk = "low" | "medium" | "high";

export interface ToolContext {
  userId: string;
  taskId?: string;
  conversationId?: string;
  workspace: "coding" | "automation";
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  /** Stable identifier, e.g. "list_files" */
  id: string;
  name: string;
  description: string;
  /** Zod schema for input validation */
  inputSchema: z.ZodType<TInput>;
  risk: ToolRisk;
  /** Whether the user must approve before execution */
  requiresConfirmation: boolean;
  timeoutMs: number;
  /** Required permission scopes (checked by server, not the model) */
  permissions: string[];
  execute: (input: TInput, ctx: ToolContext) => Promise<ToolResult<TOutput>>;
}

/** JSON Schema-ish shape exposed to the model */
export function toolToJsonSchema(tool: ToolDefinition) {
  // Minimal conversion — zod-to-json-schema can replace this later
  return {
    name: tool.id,
    description: tool.description,
    parameters: {
      type: "object",
      description: `Input for ${tool.name}`,
      additionalProperties: true,
    },
  };
}
