/**
 * Playwright browser runner with hard timeouts and public-URL policy.
 *
 * Browsers must be installed on the host:
 *   npx playwright install chromium
 *
 * Full process isolation / workers arrive in Phase 11.
 */

import { assertPublicHttpUrl } from "./url-policy";

export interface BrowserAction {
  type: "goto" | "click" | "fill" | "wait_for_selector" | "get_text" | "screenshot";
  url?: string;
  selector?: string;
  value?: string;
  timeoutMs?: number;
}

export interface BrowserRunResult {
  ok: boolean;
  finalUrl?: string;
  title?: string;
  texts: Record<string, string>;
  screenshotBase64?: string;
  error?: string;
  steps: Array<{ action: string; ok: boolean; detail?: string }>;
}

const MAX_ACTIONS = 15;
const DEFAULT_TIMEOUT = 15_000;
const MAX_TOTAL_MS = 60_000;

export async function runBrowserActions(
  actions: BrowserAction[]
): Promise<BrowserRunResult> {
  if (actions.length === 0) {
    return { ok: false, texts: {}, steps: [], error: "No actions provided" };
  }
  if (actions.length > MAX_ACTIONS) {
    return {
      ok: false,
      texts: {},
      steps: [],
      error: `Too many actions (max ${MAX_ACTIONS})`,
    };
  }

  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    return {
      ok: false,
      texts: {},
      steps: [],
      error:
        "Playwright is not installed. Run: npm install playwright && npx playwright install chromium",
    };
  }

  const started = Date.now();
  const steps: BrowserRunResult["steps"] = [];
  const texts: Record<string, string> = {};

  let browser: import("playwright").Browser | null = null;

  try {
    browser = await playwright.chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    });

    const context = await browser.newContext({
      userAgent: "Zen-Coder-Browser/1.0",
      viewport: { width: 1280, height: 720 },
      // No access to local storage from prior sessions
      ignoreHTTPSErrors: false,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT);

    for (const action of actions) {
      if (Date.now() - started > MAX_TOTAL_MS) {
        steps.push({ action: action.type, ok: false, detail: "Global timeout" });
        return {
          ok: false,
          texts,
          steps,
          error: "Browser session exceeded maximum duration",
          finalUrl: page.url(),
          title: await page.title().catch(() => undefined),
        };
      }

      try {
        switch (action.type) {
          case "goto": {
            if (!action.url) throw new Error("goto requires url");
            const url = assertPublicHttpUrl(action.url);
            await page.goto(url.toString(), {
              waitUntil: "domcontentloaded",
              timeout: action.timeoutMs ?? DEFAULT_TIMEOUT,
            });
            steps.push({ action: "goto", ok: true, detail: url.toString() });
            break;
          }
          case "click": {
            if (!action.selector) throw new Error("click requires selector");
            await page.click(action.selector, {
              timeout: action.timeoutMs ?? DEFAULT_TIMEOUT,
            });
            steps.push({ action: "click", ok: true, detail: action.selector });
            break;
          }
          case "fill": {
            if (!action.selector) throw new Error("fill requires selector");
            await page.fill(action.selector, action.value ?? "", {
              timeout: action.timeoutMs ?? DEFAULT_TIMEOUT,
            });
            steps.push({ action: "fill", ok: true, detail: action.selector });
            break;
          }
          case "wait_for_selector": {
            if (!action.selector)
              throw new Error("wait_for_selector requires selector");
            await page.waitForSelector(action.selector, {
              timeout: action.timeoutMs ?? DEFAULT_TIMEOUT,
            });
            steps.push({
              action: "wait_for_selector",
              ok: true,
              detail: action.selector,
            });
            break;
          }
          case "get_text": {
            if (!action.selector) throw new Error("get_text requires selector");
            const text = await page.locator(action.selector).innerText({
              timeout: action.timeoutMs ?? DEFAULT_TIMEOUT,
            });
            texts[action.selector] = text.slice(0, 2000);
            steps.push({
              action: "get_text",
              ok: true,
              detail: text.slice(0, 80),
            });
            break;
          }
          case "screenshot": {
            const buf = await page.screenshot({
              type: "png",
              fullPage: false,
            });
            // Cap size in base64 response
            const b64 = buf.toString("base64");
            return {
              ok: true,
              texts,
              steps: [
                ...steps,
                { action: "screenshot", ok: true, detail: "captured" },
              ],
              screenshotBase64: b64.slice(0, 200_000),
              finalUrl: page.url(),
              title: await page.title(),
            };
          }
          default:
            throw new Error(`Unknown action: ${(action as BrowserAction).type}`);
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Action failed";
        steps.push({ action: action.type, ok: false, detail });
        return {
          ok: false,
          texts,
          steps,
          error: detail,
          finalUrl: page.url(),
          title: await page.title().catch(() => undefined),
        };
      }
    }

    return {
      ok: true,
      texts,
      steps,
      finalUrl: page.url(),
      title: await page.title(),
    };
  } catch (err) {
    return {
      ok: false,
      texts,
      steps,
      error: err instanceof Error ? err.message : "Browser run failed",
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
