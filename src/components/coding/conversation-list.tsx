"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCodingConversation } from "@/lib/agent/coding-actions";
import { Button } from "@/components/ui/button";

interface ConversationItem {
  id: string;
  title: string | null;
  updatedAt: Date | number | null;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  activeId?: string;
}

export function ConversationList({
  conversations,
  activeId,
}: ConversationListProps) {
  const router = useRouter();

  async function handleNew() {
    const conv = await createCodingConversation();
    router.push(`/coding/${conv.id}`);
    router.refresh();
  }

  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-border bg-card/50">
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Conversations
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={handleNew}>
          New
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            No conversations yet
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li key={c.id}>
                  <Link
                    href={`/coding/${c.id}`}
                    className={`block truncate rounded-md px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {c.title || "Untitled"}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
