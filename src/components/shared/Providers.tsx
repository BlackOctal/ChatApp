"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/lib/supabase/client";
import { ServiceWorkerBridge } from "./ServiceWorkerBridge";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@/types";

// Build a minimal User object from Supabase auth user metadata.
// Used as a fallback when the DB profile row can't be read or created.
function buildUserFromAuth(authUser: SupabaseUser): User {
  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const email = authUser.email ?? "";
  const rawName = String(meta.full_name ?? meta.name ?? email.split("@")[0] ?? "User");
  return {
    id: authUser.id,
    email,
    username: rawName.toLowerCase().replace(/[^a-z0-9_]/g, "_") || "user",
    full_name: rawName,
    avatar_url: (meta.avatar_url ?? meta.picture ?? null) as string | null,
    about: null,
    presence: "online",
    last_seen: new Date().toISOString(),
    fcm_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function ensureProfile(authUser: SupabaseUser): Promise<User | null> {
  const supabase = createClient();
  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const email = authUser.email ?? "";
  const rawName = String(meta.full_name ?? meta.name ?? email.split("@")[0] ?? "user");
  const base = rawName.toLowerCase().replace(/[^a-z0-9_]/g, "_") || "user";

  try {
    // 1. Try reading the existing profile row
    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    if (existing) return existing as User;

    // 2. Try the security-definer RPC (created in migration)
    const { data: rpcData, error: rpcErr } = await supabase.rpc("upsert_my_profile", {
      p_email: email,
      p_username: base,
      p_full_name: rawName || base,
      p_avatar: (meta.avatar_url ?? meta.picture ?? null) as string | null,
    });
    if (!rpcErr && rpcData) return rpcData as User;

    // 3. Direct upsert fallback
    const { data: upserted } = await supabase
      .from("users")
      .upsert(
        {
          id: authUser.id,
          email,
          username: base,
          full_name: rawName || base,
          avatar_url: (meta.avatar_url ?? meta.picture ?? null) as string | null,
        },
        { onConflict: "id" }
      )
      .select()
      .single();
    if (upserted) return upserted as User;
  } catch {
    // All DB paths failed — caller will use auth metadata fallback
  }

  return null;
}

function AuthSynchronizer() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const supabase = createClient();

    // Safety net: loading must end even if Supabase is unreachable
    const fallbackTimer = setTimeout(() => setLoading(false), 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "INITIAL_SESSION") {
          if (session?.user) {
            const profile = await ensureProfile(session.user);
            // CRITICAL: if DB profile is unavailable, never log the user out.
            // Fall back to auth metadata so the app stays functional.
            setUser(profile ?? buildUserFromAuth(session.user));
          } else {
            setUser(null);
          }
          clearTimeout(fallbackTimer);
          setLoading(false);
        } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          if (session?.user) {
            const profile = await ensureProfile(session.user);
            setUser(profile ?? buildUserFromAuth(session.user));
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
        // TOKEN_REFRESHED: profile unchanged, skip
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
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
