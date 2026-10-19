import { Header } from "@/components/layout/header";
import { ConversationList } from "@/components/coding/conversation-list";
import { ChatPanel } from "@/components/coding/chat-panel";
import { listCodingConversations } from "@/lib/agent/coding-actions";

export default async function CodingPage() {
  const conversations = await listCodingConversations();

  return (
    <>
      <Header
        title="Coding"
        description="AI coding agent, repositories, and tasks"
      />
      <div className="flex flex-1 overflow-hidden">
        <ConversationList conversations={conversations} />
        <ChatPanel conversationId={null} initialMessages={[]} />
      </div>
    </>
  );
}
