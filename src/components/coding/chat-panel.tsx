"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendCodingMessage } from "@/lib/agent/coding-actions";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ArchitecturePlanCard } from "@/components/architect/plan-card";
import { DebuggerOfferCard } from "@/components/debugger/offer-card";

interface Message {
  id: string;
  role: string;
  content: string;
  metadata?: string | null;
}

interface ChatPanelProps {
  conversationId: string | null;
  initialMessages: Message[];
  initialPlan?: {
    planId: string;
    mode: string;
    content: string;
    status: string;
  } | null;
}

export function ChatPanel({
  conversationId,
  initialMessages,
  initialPlan,
}: ChatPanelProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState(initialPlan ?? null);
  const [debuggerOffer, setDebuggerOffer] = useState<{
    runId: string;
    message: string;
  } | null>(null);
  const [lastAssistant, setLastAssistant] = useState("");

  function handleSend(text: string) {
    if (!text.trim() || pending) return;
    setError(null);
    setDebuggerOffer(null);

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      try {
        const result = await sendCodingMessage(conversationId, text);
        if (!result.success && !result.architecturePlan) {
          setError(result.error ?? "Message failed");
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          return;
        }
        if (result.conversationId && result.conversationId !== conversationId) {
          router.push(`/coding/${result.conversationId}`);
          router.refresh();
          return;
        }
        if (result.architecturePlan) {
          setPlan(result.architecturePlan);
        }
        if (result.debuggerOffer) {
          setDebuggerOffer(result.debuggerOffer);
        }
        if (result.assistantMessage) {
          setLastAssistant(result.assistantMessage);
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== optimistic.id),
            { id: `u-${Date.now()}`, role: "user", content: text },
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              content: result.assistantMessage!,
            },
          ]);
        }
        if (result.error && result.architecturePlan) {
          // awaiting approval is not a hard failure
          setError(null);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    });
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <MessageList messages={messages} />
      {plan && (
        <ArchitecturePlanCard
          planId={plan.planId}
          mode={plan.mode}
          content={plan.content}
          status={plan.status}
        />
      )}
      {debuggerOffer && (
        <DebuggerOfferCard
          runId={debuggerOffer.runId}
          message={debuggerOffer.message}
          assistantSummary={lastAssistant}
        />
      )}
      {error && (
        <div role="alert" className="border-t border-destructive/25 bg-destructive-soft px-4 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}
      <ChatInput onSend={handleSend} disabled={pending} />
    </div>
  );
}
