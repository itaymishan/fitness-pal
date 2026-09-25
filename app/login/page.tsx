"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-1 text-3xl">🥗</div>
        <h1 className="text-xl font-bold">Meal Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sign in with a magic link — no password needed.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            Check your inbox — we sent a sign-in link to{" "}
            <span className="font-semibold">{email}</span>. It expires in an
            hour.
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send me a sign-in link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
