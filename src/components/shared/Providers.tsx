"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/lib/supabase/client";
import { ServiceWorkerBridge } from "./ServiceWorkerBridge";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Uses the Supabase client directly (Bearer token) instead of a server API route.
// This avoids cookie race conditions where the session is in memory but not yet
// written to cookies when the server-side route tries to authenticate.
async function ensureProfile(authUser: SupabaseUser) {
  const supabase = createClient();
  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const email = authUser.email ?? "";

  // Fast path — profile already exists
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existing) return existing;

  // Create via security-definer RPC so RLS never blocks the INSERT
  const rawName = String(meta.full_name ?? meta.name ?? email.split("@")[0] ?? "user");
  const base = rawName.toLowerCase().replace(/[^a-z0-9_]/g, "_") || "user";

  const { data } = await supabase.rpc("upsert_my_profile", {
    p_email: email,
    p_username: base,
    p_full_name: rawName || base,
    p_avatar: (meta.avatar_url ?? meta.picture ?? null) as string | null,
  });

  return data;
}

function AuthSynchronizer() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const profile = await ensureProfile(data.session.user);
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
        const profile = await ensureProfile(session.user);
        setUser(profile);
      }
      // TOKEN_REFRESHED: session already loaded above via getSession — skip
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
