"use client";

import Link from "next/link";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { CalendarCheck, Home } from "lucide-react";

/**
 * Step 4 - Done. The one milestone beat where the mascot celebrates
 * (contract §3 rule: mascot for personality moments only).
 */
export function DoneStep({ accountEmail }: { accountEmail?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
      <div className="relative">
        <Mascot variant="hop" size={200} />
        <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-accent-beak text-white text-h3 font-bold flex items-center justify-center shadow-pop">
          ✓
        </div>
      </div>
      <div>
        <h1 className="text-display text-ink-strong">You're set</h1>
        <p className="mt-2 text-body text-ink-soft max-w-sm mx-auto">
          Taste profile, offer, and your landing week - all in place. Time to open
          the app.
        </p>
        {accountEmail ? (
          <p className="mt-2 text-caption text-ink-muted">
            Your account: {accountEmail} (use it on the login page next time)
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button asChild size="lg" variant="accent">
          <Link href="/landing">
            <CalendarCheck className="h-4 w-4" aria-hidden />
            See my landing week
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/feed">
            <Home className="h-4 w-4" aria-hidden />
            Open the shell
          </Link>
        </Button>
      </div>
    </div>
  );
}
