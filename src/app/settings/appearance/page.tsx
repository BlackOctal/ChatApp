"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toaster";

type Theme = "light" | "dark" | "system";
type FontSize = "small" | "medium" | "large";

const THEMES: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light",  label: "Light",  icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark",   label: "Dark",   icon: Moon },
];

const FONT_SIZES: { value: FontSize; label: string; preview: string }[] = [
  { value: "small",  label: "Small",  preview: "Aa" },
  { value: "medium", label: "Medium", preview: "Aa" },
  { value: "large",  label: "Large",  preview: "Aa" },
];

const WALLPAPERS = [
  { id: "default", color: "#ECE5DD", label: "Default" },
  { id: "white",   color: "#FFFFFF", label: "White" },
  { id: "dark",    color: "#1A2327", label: "Dark" },
  { id: "teal",    color: "#008069", label: "Teal" },
  { id: "blue",    color: "#1E3A5F", label: "Blue" },
  { id: "purple",  color: "#2D1B69", label: "Purple" },
];

function applyTheme(value: Theme) {
  const root = document.documentElement;
  if (value === "dark") {
    root.classList.add("dark");
  } else if (value === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    prefersDark ? root.classList.add("dark") : root.classList.remove("dark");
  }
}

export default function AppearancePage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("system");
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [wallpaper, setWallpaper] = useState("default");

  // Load saved preferences on mount
  useEffect(() => {
    const savedTheme = (localStorage.getItem("chat_theme") as Theme) || "system";
    const savedFont = (localStorage.getItem("chat_fontSize") as FontSize) || "medium";
    const savedWallpaper = localStorage.getItem("chat_wallpaper") || "default";
    setTheme(savedTheme);
    setFontSize(savedFont);
    setWallpaper(savedWallpaper);
    applyTheme(savedTheme);
  }, []);

  function save(key: string, value: string) {
    localStorage.setItem(`chat_${key}`, value);
    if (key === "theme") applyTheme(value as Theme);
    toast({ title: "Saved" });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-16 md:pb-0 bg-gray-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 pt-safe">
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Appearance</h1>
      </div>

      <div className="space-y-4 mt-3">
        {/* Theme */}
        <div className="bg-white px-4 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => { setTheme(value); save("theme", value); }}
                className={cn(
                  "flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-colors",
                  theme === value ? "border-[#25D366] bg-green-50" : "border-gray-200"
                )}
              >
                <Icon size={22} className={theme === value ? "text-[#25D366]" : "text-gray-500"} />
                <span className={`text-xs font-medium ${theme === value ? "text-[#25D366]" : "text-gray-600"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Font size */}
        <div className="bg-white px-4 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Font size</p>
          <div className="grid grid-cols-3 gap-3">
            {FONT_SIZES.map(({ value, label, preview }) => (
              <button
                key={value}
                onClick={() => { setFontSize(value); save("fontSize", value); }}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors",
                  fontSize === value ? "border-[#25D366] bg-green-50" : "border-gray-200"
                )}
              >
                <span
                  className={cn(
                    "font-semibold text-gray-700",
                    value === "small" ? "text-base" : value === "large" ? "text-2xl" : "text-xl"
                  )}
                >
                  {preview}
                </span>
                <span className={`text-xs font-medium ${fontSize === value ? "text-[#25D366]" : "text-gray-600"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat wallpaper */}
        <div className="bg-white px-4 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Chat wallpaper</p>
          <div className="grid grid-cols-3 gap-3">
            {WALLPAPERS.map(({ id, color, label }) => (
              <button
                key={id}
                onClick={() => { setWallpaper(id); save("wallpaper", id); }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl overflow-hidden border-2 transition-colors",
                  wallpaper === id ? "border-[#25D366]" : "border-gray-200"
                )}
              >
                <div className="w-full h-16" style={{ backgroundColor: color }} />
                <span className={`text-xs font-medium pb-2 ${wallpaper === id ? "text-[#25D366]" : "text-gray-600"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
