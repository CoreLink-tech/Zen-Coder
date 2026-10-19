/**
 * GET /api/ai/providers
 * Returns configured providers and available models.
 * Does NOT expose API keys.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import {
  listProviders,
  MODEL_REGISTRY,
} from "@/lib/ai";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = listProviders().map((p) => ({
    id: p.id,
    displayName: p.displayName,
    configured: p.isConfigured(),
    models: p.listModels().map((m) => ({
      id: m.id,
      displayName: m.displayName,
      contextWindow: m.contextWindow,
      supportsTools: m.supportsTools,
    })),
  }));

  return NextResponse.json({
    providers,
    defaultModel: MODEL_REGISTRY[0]?.id ?? null,
  });
}
