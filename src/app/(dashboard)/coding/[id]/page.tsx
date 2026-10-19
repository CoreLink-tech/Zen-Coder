import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ConversationList } from "@/components/coding/conversation-list";
import { ChatPanel } from "@/components/coding/chat-panel";
import {
  getCodingConversation,
  listCodingConversations,
} from "@/lib/agent/coding-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CodingConversationPage({ params }: PageProps) {
  const { id } = await params;
  const [conversation, conversations] = await Promise.all([
    getCodingConversation(id),
    listCodingConversations(),
  ]);

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
      <div className="flex flex-1 overflow-hidden">
        <ConversationList conversations={conversations} activeId={id} />
        <ChatPanel conversationId={id} initialMessages={messages} />
      </div>
    </>
  );
}
