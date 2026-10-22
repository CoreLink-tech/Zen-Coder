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
  // Method syntax keeps parameter checking bivariant so specific tool
  // definitions can be stored in the heterogeneous registry.
  execute(input: TInput, ctx: ToolContext): Promise<ToolResult<TOutput>>;
}

/** Best-effort Zod → JSON Schema for tool parameters exposed to the model */
function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  let current: z.ZodTypeAny = schema;
  // Unwrap optional/default
  while (
    current instanceof z.ZodOptional ||
    current instanceof z.ZodDefault
  ) {
    current = current._def.innerType as z.ZodTypeAny;
  }

  if (current instanceof z.ZodObject) {
    const shape = current.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      let field: z.ZodTypeAny = value;
      let isOptional = false;
      if (field instanceof z.ZodOptional) {
        isOptional = true;
        field = field._def.innerType as z.ZodTypeAny;
      }
      if (field instanceof z.ZodDefault) {
        isOptional = true;
        field = field._def.innerType as z.ZodTypeAny;
      }

      properties[key] = zodFieldToJson(field);
      if (!isOptional) required.push(key);
    }

    return {
      type: "object",
      properties,
      ...(required.length ? { required } : {}),
      additionalProperties: false,
    };
  }

  return { type: "object", additionalProperties: true };
}

function zodFieldToJson(field: z.ZodTypeAny): Record<string, unknown> {
  if (field instanceof z.ZodString) {
    const out: Record<string, unknown> = { type: "string" };
    if (field.description) out.description = field.description;
    return out;
  }
  if (field instanceof z.ZodNumber) {
    return { type: "number" };
  }
  if (field instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }
  if (field instanceof z.ZodEnum) {
    return { type: "string", enum: field._def.values };
  }
  if (field instanceof z.ZodArray) {
    return {
      type: "array",
      items: zodFieldToJson(field._def.type as z.ZodTypeAny),
    };
  }
  if (field instanceof z.ZodRecord) {
    return { type: "object", additionalProperties: true };
  }
  if (field instanceof z.ZodObject) {
    return zodToJsonSchema(field);
  }
  if (field instanceof z.ZodOptional || field instanceof z.ZodDefault) {
    return zodFieldToJson(field._def.innerType as z.ZodTypeAny);
  }
  return {};
}

/** JSON Schema shape exposed to the model */
export function toolToJsonSchema(tool: ToolDefinition) {
  return {
    name: tool.id,
    description: tool.description,
    parameters: zodToJsonSchema(tool.inputSchema as z.ZodTypeAny),
  };
}
