/**
 * Inbound webhook to trigger a workflow run.
 *
 * POST /api/webhooks/workflows/:id
 * Header: X-Zen-Webhook-Secret: <secret>
 * or Authorization: Bearer <secret>
 *
 * Enqueues a background job (does not run inline) to avoid long request times.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { enqueueWorkflowJob } from "@/lib/automation/jobs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const secret =
    req.headers.get("x-zen-webhook-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("secret");

  if (!secret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 401 });
  }

  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.id, id),
  });

  if (!workflow || !workflow.webhookSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (workflow.webhookSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (workflow.status !== "active") {
    return NextResponse.json(
      { error: `Workflow is ${workflow.status}` },
      { status: 409 }
    );
  }

  const job = await enqueueWorkflowJob({
    userId: workflow.userId,
    workflowId: workflow.id,
    runAt: new Date(),
  });

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    message: "Workflow run enqueued",
  });
}
