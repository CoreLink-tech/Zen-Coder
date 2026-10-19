"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  addMessage,
  createConversationForUser,
  getConversationForUser,
  listConversationsForUser,
} from "@/lib/db/queries";
import { db } from "@/lib/db";
import { agentTasks, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runAgent } from "./engine";
import type { ChatMessage } from "@/lib/ai";

export async function listCodingConversations() {
  const user = await requireUser();
  return listConversationsForUser(user.id, "coding");
}

export async function getCodingConversation(conversationId: string) {
  const user = await requireUser();
  const conversation = await getConversationForUser(conversationId, user.id);
  if (!conversation || conversation.workspace !== "coding") {
    return null;
  }
  return conversation;
}

export async function createCodingConversation(title?: string) {
  const user = await requireUser();
  const conversation = await createConversationForUser(user.id, {
    workspace: "coding",
    title: title ?? "New conversation",
  });
  revalidatePath("/coding");
  return conversation;
}

export type SendMessageResult = {
  success: boolean;
  conversationId?: string;
  assistantMessage?: string;
  steps?: Array<{ type: string; content: string; toolId?: string }>;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  estimatedCredits?: number | null;
  error?: string;
};

export async function sendCodingMessage(
  conversationId: string | null,
  content: string,
  model?: string
): Promise<SendMessageResult> {
  const user = await requireUser();
  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "Message cannot be empty" };
  }

  // Create conversation if needed
  let convId = conversationId;
  if (!convId) {
    const conv = await createConversationForUser(user.id, {
      workspace: "coding",
      title: trimmed.slice(0, 80),
    });
    convId = conv.id;
  } else {
    const existing = await getConversationForUser(convId, user.id);
    if (!existing || existing.workspace !== "coding") {
      return { success: false, error: "Conversation not found" };
    }
  }

  // Persist user message
  await addMessage(convId, user.id, {
    role: "user",
    content: trimmed,
  });

  // Load history for context
  const conversation = await getConversationForUser(convId, user.id);
  const history: ChatMessage[] = (conversation?.messages ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
    .map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

  // Create task record
  const [task] = await db
    .insert(agentTasks)
    .values({
      userId: user.id,
      conversationId: convId,
      workspace: "coding",
      title: trimmed.slice(0, 120),
      status: "running",
    })
    .returning();

  // Run agent
  const result = await runAgent({
    userId: user.id,
    workspace: "coding",
    conversationId: convId,
    taskId: task.id,
    messages: history.slice(0, -1), // history without the just-added user msg (engine adds it)
    userMessage: trimmed,
    model,
  });

  // Persist assistant message
  if (result.finalContent) {
    await addMessage(convId, user.id, {
      role: "assistant",
      content: result.finalContent,
      metadata: JSON.stringify({
        steps: result.steps,
        usage: result.usage,
        model: result.model,
        provider: result.provider,
        estimatedCredits: result.estimatedCredits,
      }),
    });
  }

  // Update task
  await db
    .update(agentTasks)
    .set({
      status: result.status === "completed" ? "completed" : "failed",
      result: result.finalContent,
      error: result.error,
      actualCredits: result.estimatedCredits ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(agentTasks.id, task.id));

  // Touch conversation updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, convId));

  revalidatePath("/coding");
  revalidatePath(`/coding/${convId}`);

  return {
    success: result.status === "completed" || result.status === "max_rounds",
    conversationId: convId,
    assistantMessage: result.finalContent,
    steps: result.steps.map((s) => ({
      type: s.type,
      content: s.content,
      toolId: s.toolId,
    })),
    usage: result.usage,
    estimatedCredits: result.estimatedCredits,
    error: result.error,
  };
}
