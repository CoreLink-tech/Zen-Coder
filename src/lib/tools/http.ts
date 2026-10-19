/**
 * Enhanced HTTP / API monitoring tools.
 */

import { z } from "zod";
import { assertPublicHttpUrl } from "@/lib/automation/url-policy";
import type { ToolDefinition } from "./types";

export const httpCheckTool: ToolDefinition<
  {
    url: string;
    method?: "GET" | "HEAD" | "POST";
    expectedStatus?: number;
    timeoutMs?: number;
    headers?: Record<string, string>;
    body?: string;
  },
  {
    ok: boolean;
    status: number;
    statusText: string;
    responseTimeMs: number;
    url: string;
    bodyPreview?: string;
  }
> = {
  id: "http_check",
  name: "HTTP status check",
  description:
    "HTTP request with status assertion and response time. Public http/https only.",
  inputSchema: z.object({
    url: z.string().url().max(2000),
    method: z.enum(["GET", "HEAD", "POST"]).optional(),
    expectedStatus: z.number().int().min(100).max(599).optional(),
    timeoutMs: z.number().int().positive().max(30_000).optional(),
    headers: z.record(z.string()).optional(),
    body: z.string().max(50_000).optional(),
  }),
  risk: "medium",
  requiresConfirmation: false,
  timeoutMs: 35_000,
  permissions: [],
  async execute(input) {
    try {
      const url = assertPublicHttpUrl(input.url);
      const method = input.method ?? "GET";
      const timeout = input.timeoutMs ?? 10_000;
      const start = Date.now();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url.toString(), {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Zen-Coder-Monitor/1.0",
          ...input.headers,
        },
        body: method === "POST" ? input.body : undefined,
      });
      clearTimeout(timer);

      let bodyPreview: string | undefined;
      if (method !== "HEAD") {
        const text = await res.text();
        bodyPreview = text.slice(0, 500);
      }

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
          bodyPreview,
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

export const httpJsonAssertTool: ToolDefinition<
  {
    url: string;
    method?: "GET" | "POST";
    expectedStatus?: number;
    jsonPath?: string;
    expectedValue?: string;
    timeoutMs?: number;
    headers?: Record<string, string>;
    body?: string;
  },
  {
    ok: boolean;
    status: number;
    responseTimeMs: number;
    extracted?: unknown;
    message: string;
  }
> = {
  id: "http_json_assert",
  name: "HTTP JSON assert",
  description:
    "Fetch JSON and optionally assert a top-level or dotted path equals expectedValue.",
  inputSchema: z.object({
    url: z.string().url().max(2000),
    method: z.enum(["GET", "POST"]).optional(),
    expectedStatus: z.number().int().min(100).max(599).optional(),
    jsonPath: z.string().max(200).optional(),
    expectedValue: z.string().max(2000).optional(),
    timeoutMs: z.number().int().positive().max(30_000).optional(),
    headers: z.record(z.string()).optional(),
    body: z.string().max(50_000).optional(),
  }),
  risk: "medium",
  requiresConfirmation: false,
  timeoutMs: 35_000,
  permissions: [],
  async execute(input) {
    try {
      const url = assertPublicHttpUrl(input.url);
      const method = input.method ?? "GET";
      const timeout = input.timeoutMs ?? 10_000;
      const start = Date.now();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url.toString(), {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Zen-Coder-Monitor/1.0",
          Accept: "application/json",
          ...input.headers,
        },
        body: method === "POST" ? input.body : undefined,
      });
      clearTimeout(timer);

      const responseTimeMs = Date.now() - start;
      const expectedStatus = input.expectedStatus ?? 200;
      if (res.status !== expectedStatus) {
        return {
          success: true,
          data: {
            ok: false,
            status: res.status,
            responseTimeMs,
            message: `Expected status ${expectedStatus}, got ${res.status}`,
          },
        };
      }

      const json = (await res.json()) as unknown;
      let extracted: unknown = json;

      if (input.jsonPath) {
        const parts = input.jsonPath.split(".").filter(Boolean);
        let cur: unknown = json;
        for (const p of parts) {
          if (cur && typeof cur === "object" && p in (cur as object)) {
            cur = (cur as Record<string, unknown>)[p];
          } else {
            return {
              success: true,
              data: {
                ok: false,
                status: res.status,
                responseTimeMs,
                message: `Path not found: ${input.jsonPath}`,
              },
            };
          }
        }
        extracted = cur;
      }

      if (input.expectedValue !== undefined) {
        const actual =
          typeof extracted === "string"
            ? extracted
            : JSON.stringify(extracted);
        const ok = actual === input.expectedValue;
        return {
          success: true,
          data: {
            ok,
            status: res.status,
            responseTimeMs,
            extracted,
            message: ok
              ? "Assertion passed"
              : `Expected ${input.expectedValue}, got ${actual}`,
          },
        };
      }

      return {
        success: true,
        data: {
          ok: true,
          status: res.status,
          responseTimeMs,
          extracted,
          message: "JSON fetched",
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "JSON assert failed",
      };
    }
  },
};

export const HTTP_TOOLS: ToolDefinition[] = [httpCheckTool, httpJsonAssertTool];
