import { Header } from "@/components/layout/header";
import { ConversationList } from "@/components/coding/conversation-list";
import { ChatPanel } from "@/components/coding/chat-panel";
import { listCodingConversations } from "@/lib/agent/coding-actions";

export default async function CodingPage() {
  let conversations: Awaited<ReturnType<typeof listCodingConversations>> = [];
  try {
    conversations = await listCodingConversations();
  } catch (e) {
    console.error("listCodingConversations", e);
  }

  return (
    <>
      <Header
        title="Coding"
        description="AI coding agent, repositories, and tasks"
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <ConversationList conversations={conversations} />
        <ChatPanel conversationId={null} initialMessages={[]} />
      </div>
    </>
  );
}
