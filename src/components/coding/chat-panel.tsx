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
  const [messages, setMessages] = useState(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [optimisticUser, setOptimisticUser] = useState<string | null>(null);

  async function handleSend(content: string) {
    setError(null);
    setOptimisticUser(content);

    // Optimistic user bubble
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content },
    ]);

    startTransition(async () => {
      const result = await sendCodingMessage(conversationId, content);

      setOptimisticUser(null);

      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      // If this created a new conversation, navigate to it
      if (!conversationId && result.conversationId) {
        router.push(`/coding/${result.conversationId}`);
        router.refresh();
        return;
      }

      // Append assistant reply
      if (result.assistantMessage) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          { id: `user-${Date.now()}`, role: "user", content },
          {
            id: `asst-${Date.now()}`,
            role: "assistant",
            content: result.assistantMessage!,
          },
        ]);
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList
        messages={messages}
        streamingContent={
          pending && optimisticUser ? "Thinking…" : undefined
        }
      />
      {error && (
        <div className="border-t border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <ChatInput onSend={handleSend} disabled={pending} />
    </div>
  );
}
