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
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6 text-center sm:p-8">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M13.5 6.5l-3 11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-title text-foreground">Start a coding conversation</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Ask about code, request changes, or describe a bug. Use{" "}
            <span className="font-medium text-foreground">New chat</span> to
            begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
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
        className={`max-w-[92%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[80%] ${
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm border border-border bg-card text-card-foreground"
        } ${pending ? "animate-pulse opacity-80" : ""}`}
      >
        {!isUser && (
          <div className="mb-1 text-label">
            Zen-Coder
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">{content}</div>
      </div>
    </div>
  );
}
