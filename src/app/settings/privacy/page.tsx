"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toaster";

type Visibility = "everyone" | "contacts" | "nobody";

interface VisibilitySetting {
  key: string;
  label: string;
  value: Visibility;
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "everyone",  label: "Everyone" },
  { value: "contacts",  label: "My contacts" },
  { value: "nobody",    label: "Nobody" },
];

export default function PrivacyPage() {
  const router = useRouter();
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySetting[]>([
    { key: "last_seen", label: "Last seen & online", value: "everyone" },
    { key: "profile",   label: "Profile photo",      value: "everyone" },
    { key: "about",     label: "About",               value: "everyone" },
    { key: "status",    label: "Status",              value: "contacts" },
  ]);
  const [readReceipts, setReadReceipts] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  function updateVisibility(key: string, value: Visibility) {
    setVisibilitySettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
    setActiveDropdown(null);
    toast({ title: "Saved" });
  }

  function toggleReadReceipts() {
    setReadReceipts((v) => {
      const next = !v;
      toast({
        title: next ? "Read receipts enabled" : "Read receipts disabled",
        description: next
          ? "Others can see when you've read their messages"
          : "Others can't see when you've read their messages",
      });
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-16 md:pb-0 bg-gray-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 pt-safe">
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Privacy</h1>
      </div>

      <div className="space-y-4 mt-3">
        {/* Visibility settings */}
        <div className="bg-white">
          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Who can see my info
          </p>
          <div className="divide-y divide-gray-100">
            {visibilitySettings.map(({ key, label, value }) => (
              <div key={key}>
                <button
                  className="flex items-center justify-between px-4 py-3.5 w-full hover:bg-gray-50"
                  onClick={() => setActiveDropdown(activeDropdown === key ? null : key)}
                >
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-500">
                      {VISIBILITY_OPTIONS.find((o) => o.value === value)?.label}
                    </span>
                    <ChevronRight
                      size={15}
                      className={cn(
                        "text-gray-400 transition-transform",
                        activeDropdown === key ? "rotate-90" : ""
                      )}
                    />
                  </div>
                </button>
                {activeDropdown === key && (
                  <div className="bg-gray-50 border-t border-gray-100">
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateVisibility(key, opt.value)}
                        className={cn(
                          "flex items-center justify-between px-8 py-3 w-full text-sm hover:bg-gray-100",
                          value === opt.value ? "text-[#25D366] font-medium" : "text-gray-700"
                        )}
                      >
                        {opt.label}
                        {value === opt.value && (
                          <span className="h-2 w-2 rounded-full bg-[#25D366]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Read receipts */}
        <div className="bg-white">
          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Messages
          </p>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-gray-900">Read receipts</p>
              <p className="text-xs text-gray-500 mt-0.5">If turned off, you won&apos;t send or receive read receipts</p>
            </div>
            <button
              role="switch"
              aria-checked={readReceipts}
              onClick={toggleReadReceipts}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                readReceipts ? "bg-[#25D366]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  readReceipts ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center px-4 pb-4">
          Privacy settings are stored locally and will reset on next sign-in.
        </p>
      </div>
    </div>
  );
}
