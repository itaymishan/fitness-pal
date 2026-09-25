"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      if (data.session) {
        // Email confirmation is off — signed in immediately.
        window.location.href = "/diary";
        return;
      }
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        /already registered|already exists/i.test(message)
          ? "An account with this email already exists — try signing in instead."
          : message || "Could not create your account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-1 text-3xl">🥗</div>
        <h1 className="text-xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sign up with your email and a password.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            Check your inbox — we sent a confirmation link to{" "}
            <span className="font-semibold">{email}</span>. Click it to finish
            creating your account.
          </div>
        ) : (
          <form onSubmit={signUp} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 8 characters)"
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-16 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Sign up"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-700">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
