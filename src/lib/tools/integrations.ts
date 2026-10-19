/**
 * Additional automation integrations (Phase 12).
 * Prefer reliable, permissioned, public-URL-only side effects.
 */

import { z } from "zod";
import { assertPublicHttpUrl } from "@/lib/automation/url-policy";
import type { ToolDefinition } from "./types";

/**
 * Outbound webhook notification — POST JSON to a public HTTPS endpoint.
 * Use for alerting systems you control (e.g. Slack incoming webhook, custom receiver).
 */
export const notifyWebhookTool: ToolDefinition<
  {
    url: string;
    payload?: Record<string, unknown>;
    text?: string;
    timeoutMs?: number;
  },
  { status: number; ok: boolean; responseTimeMs: number }
> = {
  id: "notify_webhook",
  name: "Notify webhook",
  description:
    "POST a JSON notification to a public http(s) webhook URL. Blocked for private/local hosts.",
  inputSchema: z.object({
    url: z.string().url().max(2000),
    payload: z.record(z.unknown()).optional(),
    text: z.string().max(4000).optional(),
    timeoutMs: z.number().int().positive().max(15_000).optional(),
  }),
  risk: "high",
  requiresConfirmation: false,
  timeoutMs: 20_000,
  permissions: ["automation:notify"],
  async execute(input) {
    try {
      const url = assertPublicHttpUrl(input.url);
      if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
        return {
          success: false,
          error: "Production notifications require HTTPS webhooks",
        };
      }

      const body = JSON.stringify(
        input.payload ?? {
          text: input.text ?? "Zen-Coder automation notification",
          source: "zen-coder",
          at: new Date().toISOString(),
        }
      );

      const timeout = input.timeoutMs ?? 8_000;
      const start = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Zen-Coder-Notify/1.0",
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      return {
        success: true,
        data: {
          status: res.status,
          ok: res.ok,
          responseTimeMs: Date.now() - start,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Webhook notify failed",
      };
    }
  },
};

/**
 * Response-time budget check — fail if latency exceeds threshold.
 */
export const httpLatencyBudgetTool: ToolDefinition<
  {
    url: string;
    maxMs: number;
    method?: "GET" | "HEAD";
    timeoutMs?: number;
  },
  {
    ok: boolean;
    responseTimeMs: number;
    status: number;
    maxMs: number;
    message: string;
  }
> = {
  id: "http_latency_budget",
  name: "HTTP latency budget",
  description:
    "Request a public URL and assert response time is under maxMs.",
  inputSchema: z.object({
    url: z.string().url().max(2000),
    maxMs: z.number().int().positive().max(30_000),
    method: z.enum(["GET", "HEAD"]).optional(),
    timeoutMs: z.number().int().positive().max(30_000).optional(),
  }),
  risk: "medium",
  requiresConfirmation: false,
  timeoutMs: 35_000,
  permissions: [],
  async execute(input) {
    try {
      const url = assertPublicHttpUrl(input.url);
      const timeout = input.timeoutMs ?? Math.max(input.maxMs + 2_000, 5_000);
      const start = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url.toString(), {
        method: input.method ?? "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Zen-Coder-Monitor/1.0" },
      });
      clearTimeout(timer);
      const responseTimeMs = Date.now() - start;
      const ok = responseTimeMs <= input.maxMs;

      return {
        success: true,
        data: {
          ok,
          responseTimeMs,
          status: res.status,
          maxMs: input.maxMs,
          message: ok
            ? `Within budget (${responseTimeMs}ms ≤ ${input.maxMs}ms)`
            : `Exceeded budget (${responseTimeMs}ms > ${input.maxMs}ms)`,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Latency check failed",
      };
    }
  },
};

/**
 * Multi-URL availability sweep — check several endpoints in one step.
 */
export const httpMultiCheckTool: ToolDefinition<
  {
    urls: string[];
    expectedStatus?: number;
    timeoutMs?: number;
  },
  {
    ok: boolean;
    results: Array<{
      url: string;
      status?: number;
      responseTimeMs?: number;
      error?: string;
      ok: boolean;
    }>;
  }
> = {
  id: "http_multi_check",
  name: "HTTP multi-check",
  description:
    "Check up to 10 public URLs for expected status. Fails if any target fails.",
  inputSchema: z.object({
    urls: z.array(z.string().url().max(2000)).min(1).max(10),
    expectedStatus: z.number().int().min(100).max(599).optional(),
    timeoutMs: z.number().int().positive().max(15_000).optional(),
  }),
  risk: "medium",
  requiresConfirmation: false,
  timeoutMs: 60_000,
  permissions: [],
  async execute(input) {
    const expected = input.expectedStatus ?? 200;
    const timeout = input.timeoutMs ?? 8_000;
    const results: Array<{
      url: string;
      status?: number;
      responseTimeMs?: number;
      error?: string;
      ok: boolean;
    }> = [];

    for (const raw of input.urls) {
      try {
        const url = assertPublicHttpUrl(raw);
        const start = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(url.toString(), {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "Zen-Coder-Monitor/1.0" },
        });
        clearTimeout(timer);
        const responseTimeMs = Date.now() - start;
        results.push({
          url: url.toString(),
          status: res.status,
          responseTimeMs,
          ok: res.status === expected,
        });
      } catch (err) {
        results.push({
          url: raw,
          ok: false,
          error: err instanceof Error ? err.message : "Request failed",
        });
      }
    }

    return {
      success: true,
      data: {
        ok: results.every((r) => r.ok),
        results,
      },
    };
  },
};

export const INTEGRATION_TOOLS: ToolDefinition[] = [
  notifyWebhookTool,
  httpLatencyBudgetTool,
  httpMultiCheckTool,
];
