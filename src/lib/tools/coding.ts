/**
 * Initial coding tools — safe, deterministic, no external side effects yet.
 * Real repo tools arrive in Phase 6–7.
 */

import { z } from "zod";
import type { ToolDefinition } from "./types";

export const echoTool: ToolDefinition<
  { message: string },
  { echo: string }
> = {
  id: "echo",
  name: "Echo",
  description: "Echo a message back. Useful for verifying the tool loop.",
  inputSchema: z.object({
    message: z.string().min(1).max(2000),
  }),
  risk: "low",
  requiresConfirmation: false,
  timeoutMs: 5_000,
  permissions: [],
  async execute(input) {
    return { success: true, data: { echo: input.message } };
  },
};

export const currentTimeTool: ToolDefinition<
  Record<string, never>,
  { iso: string; unixMs: number }
> = {
  id: "current_time",
  name: "Current time",
  description: "Return the current server time in ISO and Unix milliseconds.",
  inputSchema: z.object({}),
  risk: "low",
  requiresConfirmation: false,
  timeoutMs: 5_000,
  permissions: [],
  async execute() {
    const now = new Date();
    return {
      success: true,
      data: { iso: now.toISOString(), unixMs: now.getTime() },
    };
  },
};

/**
 * Placeholder: summarize a short code snippet.
 * Does not call the model — pure string analysis for the tool loop demo.
 */
export const analyzeSnippetTool: ToolDefinition<
  { code: string; language?: string },
  { lines: number; chars: number; language: string; preview: string }
> = {
  id: "analyze_snippet",
  name: "Analyze code snippet",
  description:
    "Analyze a short code snippet and return basic metrics (lines, size, preview).",
  inputSchema: z.object({
    code: z.string().min(1).max(20_000),
    language: z.string().max(40).optional(),
  }),
  risk: "low",
  requiresConfirmation: false,
  timeoutMs: 5_000,
  permissions: [],
  async execute(input) {
    const lines = input.code.split("\n").length;
    const preview = input.code.slice(0, 200);
    return {
      success: true,
      data: {
        lines,
        chars: input.code.length,
        language: input.language ?? "unknown",
        preview,
      },
    };
  },
};

export const CODING_TOOLS: ToolDefinition[] = [
  echoTool,
  currentTimeTool,
  analyzeSnippetTool,
];
