/**
 * Browser automation tool (Playwright).
 */

import { z } from "zod";
import { runBrowserActions, type BrowserAction } from "@/lib/automation/browser";
import type { ToolDefinition } from "./types";

const actionSchema = z.object({
  type: z.enum([
    "goto",
    "click",
    "fill",
    "wait_for_selector",
    "get_text",
    "screenshot",
  ]),
  url: z.string().url().optional(),
  selector: z.string().max(500).optional(),
  value: z.string().max(5000).optional(),
  timeoutMs: z.number().int().positive().max(30_000).optional(),
});

export const browserRunTool: ToolDefinition<
  { actions: z.infer<typeof actionSchema>[] },
  {
    ok: boolean;
    finalUrl?: string;
    title?: string;
    texts: Record<string, string>;
    screenshotBase64?: string;
    steps: Array<{ action: string; ok: boolean; detail?: string }>;
    error?: string;
  }
> = {
  id: "browser_run",
  name: "Browser run",
  description:
    "Run a short sequence of browser actions (goto, click, fill, wait, get_text, screenshot) against public http(s) pages using headless Chromium.",
  inputSchema: z.object({
    actions: z.array(actionSchema).min(1).max(15),
  }),
  risk: "high",
  requiresConfirmation: false,
  timeoutMs: 90_000,
  permissions: [],
  async execute(input) {
    const result = await runBrowserActions(input.actions as BrowserAction[]);
    return {
      success: true,
      data: result,
    };
  },
};

export const BROWSER_TOOLS: ToolDefinition[] = [browserRunTool];
