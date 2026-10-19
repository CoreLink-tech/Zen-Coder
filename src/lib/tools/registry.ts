/**
 * Tool registry — only registered tools can be executed.
 * The model cannot invent tools that the server will run.
 */

import type { ToolDefinition, ToolContext, ToolResult } from "./types";
import { toolToJsonSchema } from "./types";
import { CODING_TOOLS } from "./coding";

const registry = new Map<string, ToolDefinition>();

function register(tools: ToolDefinition[]) {
  for (const tool of tools) {
    if (registry.has(tool.id)) {
      throw new Error(`Duplicate tool id: ${tool.id}`);
    }
    registry.set(tool.id, tool);
  }
}

// Register built-in tools
register(CODING_TOOLS);

export function getTool(id: string): ToolDefinition | undefined {
  return registry.get(id);
}

export function listTools(workspace?: "coding" | "automation"): ToolDefinition[] {
  // For now all registered tools are coding tools
  const all = Array.from(registry.values());
  if (!workspace || workspace === "coding") return all;
  return []; // automation tools arrive in Phase 9+
}

export function listToolSchemas(workspace?: "coding" | "automation") {
  return listTools(workspace).map(toolToJsonSchema);
}

export async function executeTool(
  toolId: string,
  rawInput: unknown,
  ctx: ToolContext
): Promise<ToolResult> {
  const tool = registry.get(toolId);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolId}` };
  }

  // Permission check (server-side)
  // Full permission system expands later; for now empty = allowed
  for (const perm of tool.permissions) {
    // Placeholder: reject if any permission is required and not granted
    if (perm) {
      return {
        success: false,
        error: `Missing permission: ${perm}`,
      };
    }
  }

  const parsed = tool.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid input: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    };
  }

  try {
    const result = await Promise.race([
      tool.execute(parsed.data, ctx),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(
          () => reject(new Error("Tool execution timed out")),
          tool.timeoutMs
        )
      ),
    ]);
    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Tool execution failed",
    };
  }
}
