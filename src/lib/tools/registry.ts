/**
 * Tool registry — only registered tools can be executed.
 * The model cannot invent tools that the server will run.
 */

import type { ToolDefinition, ToolContext, ToolResult } from "./types";
import { toolToJsonSchema } from "./types";
import { CODING_TOOLS } from "./coding";
import { GITHUB_TOOLS } from "./github";
import { GITHUB_WRITE_TOOLS } from "./github-write";
import { AUTOMATION_TOOLS } from "./automation";

const registry = new Map<string, ToolDefinition>();

const codingIds = new Set(
  [...CODING_TOOLS, ...GITHUB_TOOLS, ...GITHUB_WRITE_TOOLS].map((t) => t.id)
);
const automationIds = new Set(AUTOMATION_TOOLS.map((t) => t.id));

function register(tools: ToolDefinition[]) {
  for (const tool of tools) {
    if (registry.has(tool.id)) {
      throw new Error(`Duplicate tool id: ${tool.id}`);
    }
    registry.set(tool.id, tool);
  }
}

register(CODING_TOOLS);
register(GITHUB_TOOLS);
register(GITHUB_WRITE_TOOLS);
register(AUTOMATION_TOOLS);

export function getTool(id: string): ToolDefinition | undefined {
  return registry.get(id);
}

export function listTools(workspace?: "coding" | "automation"): ToolDefinition[] {
  const all = Array.from(registry.values());
  if (workspace === "automation") {
    return all.filter((t) => automationIds.has(t.id));
  }
  if (workspace === "coding") {
    return all.filter((t) => codingIds.has(t.id));
  }
  return all;
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

  for (const perm of tool.permissions) {
    if (perm) {
      return { success: false, error: `Missing permission: ${perm}` };
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
