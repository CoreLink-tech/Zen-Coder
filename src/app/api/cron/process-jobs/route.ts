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
import { timingSafeEqualStr } from "@/lib/security/compare";

/**
 * Requires CRON_SECRET. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * when the env var is set, so no separate header trust is needed. The
 * x-vercel-cron header is client-settable and is NOT accepted as proof.
 * Without a secret, only non-production environments are allowed.
 */
function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization") ?? "";
  if (timingSafeEqualStr(header, `Bearer ${secret}`)) return true;
  const q = req.nextUrl.searchParams.get("secret") ?? "";
  return q.length > 0 && timingSafeEqualStr(q, secret);
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const enqueued = await enqueueDueSchedules();
    const { processed, results } = await processDueJobs(15);
    // Don't echo per-job error text to the caller; it's in the job rows.
    return NextResponse.json({
      ok: true,
      enqueued,
      processed,
      results: results.map((r) => ({ jobId: r.jobId, ok: r.ok })),
    });
  } catch (err) {
    console.error("[cron.process-jobs]", err);
    return NextResponse.json({ ok: false, error: "Cron failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
