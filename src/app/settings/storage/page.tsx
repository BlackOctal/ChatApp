"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Image, Video, Mic, FileText, Wifi, WifiOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toaster";

type AutoDownloadNetwork = "wifi" | "cellular" | "never";

interface MediaSetting {
  key: string;
  label: string;
  icon: React.ElementType;
  network: AutoDownloadNetwork;
}

export default function StoragePage() {
  const router = useRouter();
  const [mediaSettings, setMediaSettings] = useState<MediaSetting[]>([
    { key: "photos",  label: "Photos",         icon: Image,    network: "wifi" },
    { key: "videos",  label: "Videos",         icon: Video,    network: "wifi" },
    { key: "audio",   label: "Audio",          icon: Mic,      network: "wifi" },
    { key: "documents", label: "Documents",    icon: FileText, network: "wifi" },
  ]);

  const networkOptions: { value: AutoDownloadNetwork; label: string; icon: React.ElementType }[] = [
    { value: "wifi",     label: "Wi-Fi",    icon: Wifi },
    { value: "cellular", label: "Cellular", icon: Wifi },
    { value: "never",    label: "Never",    icon: WifiOff },
  ];

  function updateNetwork(key: string, network: AutoDownloadNetwork) {
    setMediaSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, network } : s))
    );
    toast({ title: "Saved" });
  }

  function clearCache() {
    if (typeof window !== "undefined") {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }
    toast({ title: "Cache cleared", description: "Storage freed successfully" });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-16 md:pb-0 bg-gray-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 pt-safe">
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Storage & Data</h1>
      </div>

      <div className="space-y-4 mt-3">
        {/* Auto-download */}
        <div className="bg-white">
          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Auto-download media
          </p>
          <div className="divide-y divide-gray-100">
            {mediaSettings.map(({ key, label, icon: Icon, network }) => (
              <div key={key} className="px-4 py-3">
                <div className="flex items-center gap-3 mb-2.5">
                  <Icon size={18} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                </div>
                <div className="flex gap-2 ml-7">
                  {networkOptions.map(({ value, label: netLabel }) => (
                    <button
                      key={value}
                      onClick={() => updateNetwork(key, value)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        network === value
                          ? "bg-[#25D366] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {netLabel}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Network usage */}
        <div className="bg-white">
          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Network usage
          </p>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Use less data</p>
              <p className="text-xs text-gray-500 mt-0.5">Reduce data usage for calls</p>
            </div>
            <button
              role="switch"
              className="relative h-6 w-11 rounded-full bg-gray-300 transition-colors"
            >
              <span className="absolute top-0.5 h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform" />
            </button>
          </div>
        </div>

        {/* Storage management */}
        <div className="bg-white">
          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Manage storage
          </p>
          <button
            onClick={clearCache}
            className="flex items-center gap-3 px-4 py-3.5 w-full hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-900">Clear cache</p>
              <p className="text-xs text-gray-500 mt-0.5">Free up space by clearing cached data</p>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center px-4 pb-4">
          Media files expire automatically after 30 days.
        </p>
      </div>
    </div>
  );
}
