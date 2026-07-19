"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/session";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const { currentUser, mode } = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (mode !== "live" || !currentUser) return null;

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (!supabase || busy) return;

    setBusy(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      setBusy(false);
      return;
    }

    window.location.assign("/login");
  }

  return (
    <div className={cn("flex flex-col", compact ? "items-end" : "items-stretch")}>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        aria-label={compact ? "Sign out" : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-ink-soft transition-colors hover:bg-sky-100 hover:text-ink-strong disabled:opacity-60",
          compact ? "h-9 w-9" : "px-3 py-2 text-sm",
        )}
      >
        <LogOut className="h-4 w-4" aria-hidden />
        {compact ? null : busy ? "Signing out..." : "Sign out"}
      </button>
      {error ? <span className="mt-1 text-xs text-func-scam">{error}</span> : null}
    </div>
  );
}
