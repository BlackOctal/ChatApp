import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function GroupChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatWindow conversationId={id} />;
}
