import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ConversationList } from "@/components/coding/conversation-list";
import { ChatPanel } from "@/components/coding/chat-panel";
import { PendingChanges } from "@/components/coding/changes/pending-changes";
import {
  getCodingConversation,
  listCodingConversations,
} from "@/lib/agent/coding-actions";
import { listPendingChanges } from "@/lib/github/changes";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CodingConversationPage({ params }: PageProps) {
  const { id } = await params;

  let conversation = null;
  let conversations: Awaited<ReturnType<typeof listCodingConversations>> = [];
  let proposals: Awaited<ReturnType<typeof listPendingChanges>> = [];

  try {
    [conversation, conversations, proposals] = await Promise.all([
      getCodingConversation(id),
      listCodingConversations(),
      listPendingChanges(id).catch(() => []),
    ]);
  } catch (e) {
    console.error("coding conversation page", e);
  }

  if (!conversation) {
    notFound();
  }

  const messages = (conversation.messages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    metadata: m.metadata,
  }));

  return (
    <>
      <Header
        title={conversation.title || "Conversation"}
        description="AI coding agent"
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <ConversationList conversations={conversations} activeId={id} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <PendingChanges
            proposals={proposals.map((p) => ({
              id: p.id,
              fullName: p.fullName,
              branch: p.branch,
              commitMessage: p.commitMessage,
              files: p.files,
              status: p.status,
              createdAt: p.createdAt,
            }))}
          />
          <ChatPanel conversationId={id} initialMessages={messages} />
        </div>
      </div>
    </>
  );
}
