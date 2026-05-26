import { ConversationList } from "@/components/chat/ConversationList";
import { NewChatButton } from "@/components/chat/NewChatButton";

export default function ChatsPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-card border-b border-gray-100 dark:border-border pt-safe">
        <h1 className="text-xl font-bold text-gray-900 dark:text-foreground">Chats</h1>
        <NewChatButton />
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-16 md:pb-0">
        <ConversationList />
      </div>
    </div>
  );
}
