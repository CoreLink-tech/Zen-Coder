"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendCodingMessage } from "@/lib/agent/coding-actions";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

interface Message {
  id: string;
  role: string;
  content: string;
  metadata?: string | null;
}

interface ChatPanelProps {
  conversationId: string | null;
  initialMessages: Message[];
}

export function ChatPanel({ conversationId, initialMessages }: ChatPanelProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSend(text: string) {
    if (!text.trim() || pending) return;
    setError(null);

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      try {
        const result = await sendCodingMessage(conversationId, text);
        if (!result.success) {
          setError(result.error ?? "Message failed");
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          return;
        }
        if (result.conversationId && result.conversationId !== conversationId) {
          router.push(`/coding/${result.conversationId}`);
          router.refresh();
          return;
        }
        if (result.assistantMessage) {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== optimistic.id),
            {
              id: `u-${Date.now()}`,
              role: "user",
              content: text,
            },
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              content: result.assistantMessage!,
            },
          ]);
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
      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <ChatInput onSend={handleSend} disabled={pending} />
    </div>
  );
}
