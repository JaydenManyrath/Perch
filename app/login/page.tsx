"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { BranchMotif } from "@/components/theme/BranchMotif";

const DEMO_ACCOUNTS = [
  { email: "intern0@perch.demo", label: "Banded Intern" },
  { email: "intern1@perch.demo", label: "Intern" },
  { email: "subletter0@perch.demo", label: "Subletter" },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0].email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase public URL and anon key are required for live demo login.");
      setBusy(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: `perch-demo-${email}`,
    });
    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    window.location.assign("/feed");
  }

  return (
    <main className="relative isolate overflow-hidden min-h-dvh flex items-center justify-center bg-sky-50 px-6 py-12">
      {/* Decorative branch corners behind the sign-in card - an emotional entry surface. */}
      <BranchMotif
        variant="corner"
        className="absolute bottom-0 left-0 -z-10 w-40 opacity-50 md:w-56"
      />
      <BranchMotif
        variant="corner"
        className="absolute right-0 top-0 -z-10 w-40 -scale-x-100 -scale-y-100 opacity-50 md:w-56"
      />
      <form onSubmit={signIn} className="w-full max-w-md rounded-3xl border border-sky-300 bg-white p-6 shadow-card">
        <h1 className="text-display text-ink-strong">Demo sign in</h1>
        <p className="mt-2 text-body text-ink-soft">
          Choose a seeded account. This creates a real Supabase session, so API authorization and RLS use auth.uid().
        </p>

        <label className="mt-6 block text-sm font-semibold text-ink-strong" htmlFor="demo-account">
          Account
        </label>
        <select
          id="demo-account"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-ink-strong"
        >
          {DEMO_ACCOUNTS.map((account) => (
            <option key={account.email} value={account.email}>
              {account.label}: {account.email}
            </option>
          ))}
        </select>

        {error ? <p className="mt-4 text-sm font-semibold text-func-scam">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-2xl bg-sky-400 py-3 font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>

        <Link href="/" className="mt-4 block text-center text-sm text-ink-soft underline underline-offset-2">
          Back to Perch
        </Link>
      </form>
    </main>
  );
}
