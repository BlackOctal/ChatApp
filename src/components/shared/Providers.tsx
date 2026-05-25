"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/lib/supabase/client";
import { ServiceWorkerBridge } from "./ServiceWorkerBridge";

async function getOrCreateProfile() {
  const res = await fetch("/api/users/ensure-profile", { method: "POST" });
  if (!res.ok) {
    console.error("[AuthSynchronizer] ensure-profile failed:", await res.text());
    return null;
  }
  return res.json();
}

function AuthSynchronizer() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const profile = await getOrCreateProfile();
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        // Only call ensure-profile on real sign-in — not TOKEN_REFRESHED,
        // which fires while the new cookie is still being written (causes 401).
        const profile = await getOrCreateProfile();
        setUser(profile);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSynchronizer />
      <ServiceWorkerBridge />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
