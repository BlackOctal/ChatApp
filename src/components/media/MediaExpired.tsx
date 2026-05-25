import { Clock } from "lucide-react";

export function MediaExpired() {
  return (
    <div className="flex items-center gap-2 px-3 py-3 text-gray-400">
      <Clock size={16} />
      <span className="text-sm italic">[Media Expired]</span>
    </div>
  );
}
