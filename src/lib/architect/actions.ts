"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  generateArchitecturePlan,
  getLatestPlanForConversation,
  setPlanStatus,
} from "./index";
import { getAccountSummary } from "@/lib/credits";

export async function requestArchitecturePlan(
  conversationId: string,
  userMessage: string,
  model?: string
) {
  const user = await requireUser();
  const summary = await getAccountSummary(user.id);
  if (summary.available <= 0) {
    return { success: false as const, error: "Insufficient credits" };
  }
  try {
    const plan = await generateArchitecturePlan({
      userId: user.id,
      conversationId,
      userMessage,
      model,
    });
    revalidatePath(`/coding/${conversationId}`);
    return { success: true as const, ...plan };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Planning failed",
    };
  }
}

export async function approveArchitecturePlan(planId: string) {
  const user = await requireUser();
  const result = await setPlanStatus({
    userId: user.id,
    planId,
    status: "approved",
  });
  revalidatePath("/coding");
  return result;
}

export async function rejectArchitecturePlan(planId: string, feedback?: string) {
  const user = await requireUser();
  const result = await setPlanStatus({
    userId: user.id,
    planId,
    status: "rejected",
    feedback,
  });
  revalidatePath("/coding");
  return result;
}

export async function loadArchitecturePlan(conversationId: string) {
  const user = await requireUser();
  const plan = await getLatestPlanForConversation(user.id, conversationId);
  if (!plan) return null;
  return {
    id: plan.id,
    title: plan.title,
    mode: plan.mode,
    content: plan.content,
    status: plan.status,
    model: plan.model,
    createdAt: plan.createdAt,
  };
}
