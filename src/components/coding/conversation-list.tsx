"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleNew() {
    setBusy(true);
    try {
      const conv = await createCodingConversation();
      router.push(`/coding/${conv.id}`);
      router.refresh();
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not create conversation");
    } finally {
      setBusy(false);
    }
  }

  const list = (
    <div className="flex h-full w-full flex-col bg-card/50">
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Conversations
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={handleNew}
        >
          {busy ? "…" : "New"}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            No conversations yet. Tap New to start.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li key={c.id}>
                  <Link
                    href={`/coding/${c.id}`}
                    onClick={() => setOpen(false)}
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

  return (
    <>
      {/* Mobile: toggle row */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 md:hidden">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Chats
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={busy}
          onClick={handleNew}
        >
          {busy ? "…" : "New chat"}
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close chats"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(18rem,90vw)] flex-col border-r border-border bg-card shadow-xl">
            {list}
          </div>
        </div>
      )}

      {/* Desktop list */}
      <div className="hidden w-56 shrink-0 border-r border-border md:flex md:flex-col">
        {list}
      </div>
    </>
  );
}
