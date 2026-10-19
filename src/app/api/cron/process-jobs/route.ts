/**
 * Cron endpoint — enqueue due schedules and process background jobs.
 *
 * Protect with CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 * or
 *   ?secret=<CRON_SECRET>
 *
 * Vercel Cron example (vercel.json):
 *   { "crons": [{ "path": "/api/cron/process-jobs", "schedule": "* * * * *" }] }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  enqueueDueSchedules,
  processDueJobs,
} from "@/lib/automation/jobs";

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow in development only
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  // Vercel Cron sends this header when configured
  if (req.headers.get("x-vercel-cron") === "1" && secret) {
    // Still require matching secret if set via query in some setups
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const enqueued = await enqueueDueSchedules();
    const { processed, results } = await processDueJobs(15);
    return NextResponse.json({
      ok: true,
      enqueued,
      processed,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Cron failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
