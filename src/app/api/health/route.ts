/**
 * Public health check — no secrets, minimal data.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { isGitHubAppConfigured } from "@/lib/github/config";
import { listConfiguredProviders } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let dbOk = false;
  try {
    await db.run(sql`SELECT 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const providers = listConfiguredProviders().map((p) => p.id);

  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      service: "zen-coder",
      time: new Date().toISOString(),
      latencyMs: Date.now() - started,
      checks: {
        database: dbOk ? "up" : "down",
        stripe: isStripeConfigured() ? "configured" : "not_configured",
        githubApp: isGitHubAppConfigured() ? "configured" : "not_configured",
        aiProviders: providers,
      },
    },
    { status: dbOk ? 200 : 503 }
  );
}
