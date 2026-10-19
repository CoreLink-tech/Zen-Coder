/**
 * Safe automation tools for Phase 9 foundation.
 * Browser automation arrives in Phase 10.
 */

import { z } from "zod";
import type { ToolDefinition } from "./types";

export const httpCheckTool: ToolDefinition<
  {
    url: string;
    method?: "GET" | "HEAD";
    expectedStatus?: number;
    timeoutMs?: number;
  },
  {
    ok: boolean;
    status: number;
    statusText: string;
    responseTimeMs: number;
    url: string;
  }
> = {
  id: "http_check",
  name: "HTTP status check",
  description:
    "Perform a GET or HEAD request and report status code and response time. Only http/https URLs.",
  inputSchema: z.object({
    url: z.string().url().max(2000),
    method: z.enum(["GET", "HEAD"]).optional(),
    expectedStatus: z.number().int().min(100).max(599).optional(),
    timeoutMs: z.number().int().positive().max(30_000).optional(),
  }),
  risk: "medium",
  requiresConfirmation: false,
  timeoutMs: 35_000,
  permissions: [],
  async execute(input) {
    const url = new URL(input.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { success: false, error: "Only http and https URLs are allowed" };
    }

    // Block obvious local/metadata targets in production-minded setup
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      host.startsWith("169.254.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.")
    ) {
      return {
        success: false,
        error: "Private/local network targets are not allowed",
      };
    }

    const method = input.method ?? "GET";
    const timeout = input.timeoutMs ?? 10_000;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url.toString(), {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Zen-Coder-Monitor/1.0" },
      });
      clearTimeout(timer);
      const responseTimeMs = Date.now() - start;
      const expected = input.expectedStatus ?? 200;
      const ok = res.status === expected;

      return {
        success: true,
        data: {
          ok,
          status: res.status,
          statusText: res.statusText,
          responseTimeMs,
          url: url.toString(),
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "HTTP check failed",
      };
    }
  },
};

export const logMessageTool: ToolDefinition<
  { message: string; level?: "info" | "warn" | "error" },
  { logged: true; message: string; level: string; at: string }
> = {
  id: "log_message",
  name: "Log message",
  description: "Record a message in the execution log (deterministic, no side effects).",
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

export const AUTOMATION_TOOLS: ToolDefinition[] = [httpCheckTool, logMessageTool];
