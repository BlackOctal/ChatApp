"use client";

import * as Toast from "@radix-ui/react-toast";
import { create } from "zustand";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface ToastStore {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, "id">) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: Math.random().toString(36).slice(2) }],
    })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(opts: Omit<ToastItem, "id">) {
  useToastStore.getState().add(opts);
}

export function Toaster() {
  const { toasts, remove } = useToastStore();

  return (
    <Toast.Provider swipeDirection="right">
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          open
          onOpenChange={(open) => !open && remove(t.id)}
          duration={3500}
          className={cn(
            "flex flex-col gap-1 rounded-xl px-4 py-3 shadow-lg",
            "data-[state=open]:animate-slide-up data-[state=closed]:opacity-0",
            "transition-all",
            t.variant === "destructive"
              ? "bg-red-600 text-white"
              : "bg-gray-900 text-white"
          )}
        >
          <Toast.Title className="text-sm font-semibold">{t.title}</Toast.Title>
          {t.description && (
            <Toast.Description className="text-xs opacity-80">
              {t.description}
            </Toast.Description>
          )}
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]" />
    </Toast.Provider>
  );
}
