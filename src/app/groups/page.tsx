import { GroupList } from "@/components/groups/GroupList";
import { CreateGroupButton } from "@/components/groups/CreateGroupButton";

export default function GroupsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 pt-safe">
        <h1 className="text-xl font-bold text-gray-900">Groups</h1>
        <CreateGroupButton />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-16 md:pb-0">
        <GroupList />
      </div>
    </div>
  );
}
