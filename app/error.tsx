"use client";

import { useEffect } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";

/**
 * Root error boundary — friendly landing, chick apologetic, retry button.
 * Empty/error states are personality moments (chick allowed).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-dvh bg-sky-50 flex flex-col items-center justify-center px-6 py-12 text-center">
      <Mascot variant="idle" size={140} />
      <h1 className="mt-6 text-h1 text-ink-strong">Something knocked us off the perch</h1>
      <p className="mt-2 max-w-md text-body text-ink-soft">
        Sorry about that. Try again — if it keeps failing, tell us what you clicked
        so we can help.
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
