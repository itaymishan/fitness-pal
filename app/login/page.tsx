"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "password" | "magic";

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Incorrect email or password. Try again, or reset your password below.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the confirmation link.";
  if (m.includes("too many") || m.includes("rate limit"))
    return "Too many attempts — please wait a minute and try again.";
  return message;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error") === "link";

  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(
    linkError ? "That sign-in link didn't work or has expired — try again." : null
  );
  const [loading, setLoading] = useState(false);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      window.location.href = "/diary";
    } catch (err) {
      setError(
        friendlyError(
          err instanceof Error ? err.message : "Could not sign you in."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
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

  async function sendResetLink() {
    if (!email.trim()) {
      setError("Enter your email address first, then click “Forgot password?”.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send the reset link."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-1 text-3xl">🥗</div>
      <h1 className="text-xl font-bold">Meal Tracker</h1>
      <p className="mt-1 text-sm text-gray-500">
        Sign in to pick up where you left off.
      </p>

      <div className="mt-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
        {(["password", "magic"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setError(null);
            }}
            className={`min-h-[44px] rounded-lg py-2.5 text-sm font-semibold ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {t === "password" ? "Password" : "Magic link"}
          </button>
        ))}
      </div>

      {tab === "password" ? (
        resetSent ? (
          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            Check your inbox — we sent a password-reset link to{" "}
            <span className="font-semibold">{email}</span>.
          </div>
        ) : (
          <form onSubmit={signInWithPassword} className="mt-6 space-y-3">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
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
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={sendResetLink}
              disabled={loading}
              className="min-h-[44px] w-full rounded-lg py-2.5 text-center text-sm font-medium text-emerald-700 disabled:opacity-50"
            >
              Forgot password?
            </button>
          </form>
        )
      ) : sent ? (
        <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Check your inbox — we sent a sign-in link to{" "}
          <span className="font-semibold">{email}</span>. It expires in an hour.
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="mt-6 space-y-3">
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

      <p className="mt-5 text-center text-sm text-gray-500">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-emerald-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
