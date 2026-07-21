"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

/**
 * Account-creation assist - the moment between the offer correction screen and the
 * rest of onboarding. The mint used to happen invisibly behind the Continue button;
 * this surfaces it:
 *   creating - "Creating your account for <Name>..." while POST /api/onboarding/
 *              account and the browser sign-in run;
 *   created  - the minted email, so the person knows a real login now exists and
 *              is theirs to reuse;
 *   fallback - a plain one-line note that the demo persona is standing in (fixture
 *              mode, mint failure, or sign-in failure) - never a silent swap.
 * This is a decision surface: no mascot (contract section 3), plain information only.
 */
export type AccountAssist =
  | { phase: "creating"; name: string }
  | { phase: "created"; name: string; email: string }
  | { phase: "fallback"; name: string };

export function AccountStep({
  assist,
  onContinue,
}: {
  assist: AccountAssist;
  onContinue: () => void;
}) {
  if (assist.phase === "creating") {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 text-center"
        aria-live="polite"
      >
        <h2 className="text-h2 text-ink-strong">
          Creating your account{assist.name ? ` for ${assist.name}` : ""}...
        </h2>
        <p className="text-body text-ink-soft">
          Turning the letter into a real login. One moment.
        </p>
      </div>
    );
  }

  const created = assist.phase === "created";
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
      <div className="flex flex-col items-center gap-3">
        {created ? (
          <Chip tone="accent">Account ready</Chip>
        ) : (
          <Chip tone="muted">Demo profile</Chip>
        )}
        <h2 className="text-h2 text-ink-strong">
          {created ? "Your account is ready" : "Continuing with the demo profile"}
        </h2>
      </div>

      <Card className="w-full max-w-md text-left">
        <CardContent className="p-4 flex flex-col gap-1">
          {created ? (
            <>
              <p className="text-body text-ink-strong">
                Account created: <span className="font-semibold">{assist.email}</span> - use
                it to log in next time.
              </p>
              {assist.name ? (
                <p className="text-caption text-ink-soft">Signed in as {assist.name}.</p>
              ) : null}
            </>
          ) : (
            <p className="text-body text-ink-strong">
              No live account was created - the demo persona is being used instead.
            </p>
          )}
        </CardContent>
      </Card>

      <Button size="lg" className="w-full max-w-md" onClick={onContinue}>
        Continue <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
