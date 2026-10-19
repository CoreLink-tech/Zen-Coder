"use client";

interface Message {
  id: string;
  role: string;
  content: string;
  metadata?: string | null;
}

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
}

export function MessageList({ messages, streamingContent }: MessageListProps) {
  if (messages.length === 0 && !streamingContent) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <h3 className="text-base font-semibold">Start a coding conversation</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask about code, request changes, or describe a bug. Repository tools
            arrive in later phases — for now the agent can reason and use basic
            tools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.map((m) => (
        <MessageBubble key={m.id} role={m.role} content={m.content} />
      ))}
      {streamingContent && (
        <MessageBubble role="assistant" content={streamingContent} pending />
      )}
    </div>
  );
}

function MessageBubble({
  role,
  content,
  pending,
}: {
  role: string;
  content: string;
  pending?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-card-foreground"
        } ${pending ? "opacity-80" : ""}`}
      >
        {!isUser && (
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            Zen-Coder
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">{content}</div>
      </div>
    </div>
  );
}
