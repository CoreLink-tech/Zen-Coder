"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { declineDebugger, runMultiModelDebugger } from "./index";
import { getAccountSummary } from "@/lib/credits";

export async function declineDebuggerAction(runId: string) {
  const user = await requireUser();
  const result = await declineDebugger(user.id, runId);
  revalidatePath("/coding");
  return result;
}

export async function runDebuggerAction(
  runId: string,
  context: {
    architectureJson?: string;
    assistantSummary: string;
    changedFilesNote?: string;
  }
) {
  const user = await requireUser();
  const summary = await getAccountSummary(user.id);
  if (summary.available <= 0) {
    return { success: false as const, error: "Insufficient credits for debugger" };
  }
  const result = await runMultiModelDebugger({
    userId: user.id,
    runId,
    context,
  });
  revalidatePath("/coding");
  return result;
}
