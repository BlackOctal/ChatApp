"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toaster";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-white px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm space-y-8">
        <Link href="/auth/login" className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <ArrowLeft size={18} />
          <span className="text-sm">Back to login</span>
        </Link>

        {sent ? (
          <div className="text-center space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Email sent</h2>
            <p className="text-sm text-gray-500">
              Check your inbox for a reset link. It may take a few minutes.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
              <p className="text-sm text-gray-500">Enter your email to receive a reset link.</p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Send Reset Link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
