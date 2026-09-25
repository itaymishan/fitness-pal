"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setHasSession(!!data.user);
      setChecking(false);
    })();
  }, []);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update your password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-1 text-3xl">🔑</div>
        <h1 className="text-xl font-bold">Set a new password</h1>

        {checking ? (
          <p className="mt-6 text-sm text-gray-500">Checking your link…</p>
        ) : !hasSession ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              This reset link is invalid or has expired. Request a new one from
              the sign-in page.
            </p>
            <Link
              href="/login"
              className="block w-full rounded-xl bg-emerald-600 py-3 text-center font-semibold text-white"
            >
              Back to sign in
            </Link>
          </div>
        ) : done ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              Your password has been updated — you're all set.
            </p>
            <Link
              href="/diary"
              className="block w-full rounded-xl bg-emerald-600 py-3 text-center font-semibold text-white"
            >
              Go to my diary
            </Link>
          </div>
        ) : (
          <form onSubmit={updatePassword} className="mt-6 space-y-3">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min. 8 characters)"
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-16 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={show ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
