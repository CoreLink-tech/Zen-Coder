/**
 * Core automation utility tools.
 * HTTP tools: ./http.ts
 * Browser tools: ./browser.ts
 */

import { z } from "zod";
import type { ToolDefinition } from "./types";

export const logMessageTool: ToolDefinition<
  { message: string; level?: "info" | "warn" | "error" },
  { logged: true; message: string; level: string; at: string }
> = {
  id: "log_message",
  name: "Log message",
  description:
    "Record a message in the execution log (deterministic, no side effects).",
  inputSchema: z.object({
    message: z.string().min(1).max(2000),
    level: z.enum(["info", "warn", "error"]).optional(),
  }),
  risk: "low",
  requiresConfirmation: false,
  timeoutMs: 5_000,
  permissions: [],
  async execute(input) {
    return {
      success: true,
      data: {
        logged: true as const,
        message: input.message,
        level: input.level ?? "info",
        at: new Date().toISOString(),
      },
    };
  },
};

export const AUTOMATION_CORE_TOOLS: ToolDefinition[] = [logMessageTool];
