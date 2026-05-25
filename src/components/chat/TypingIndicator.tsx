"use client";

export function TypingIndicator({ userIds }: { userIds: string[] }) {
  if (userIds.length === 0) return null;

  return (
    <div className="flex items-end gap-1.5 mb-1">
      <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-3 shadow-sm flex items-center gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}
