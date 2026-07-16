"use client";

import { useState } from "react";
import { ArrowRight, MapPinned, SkipForward } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { parseTakeout } from "@/lib/data/source";
import type { Place } from "@/lib/types/contract";

/**
 * Step 3 - Google Maps Takeout (optional). Enables the "4 min from your usual
 * coffee spot" beat. Skippable - B pre-loads a sample so the demo never breaks.
 */
export function TakeoutStep({
  onDone,
}: {
  onDone: (places: Place[] | null) => void;
}) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "reading" }
    | { kind: "done"; places: Place[] }
  >({ kind: "idle" });

  async function handleFile(file?: File) {
    setState({ kind: "reading" });
    const { places } = await parseTakeout(file);
    setState({ kind: "done", places });
  }

  if (state.kind === "reading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <Mascot variant="hop" size={160} />
        <div>
          <h2 className="text-h2 text-ink-strong">Finding your recurring places...</h2>
          <p className="mt-1 text-body text-ink-soft">Coffee, gym, transit - the anchors of your week.</p>
        </div>
      </div>
    );
  }

  if (state.kind === "done") {
    return (
      <div className="flex-1 flex flex-col gap-6">
        <header>
          <h2 className="text-h2 text-ink-strong">We found your usual spots</h2>
          <p className="mt-1 text-body text-ink-soft">
            Used to pin your new-city map and score routine-fit for sublets.
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Recurring places</CardTitle>
            <CardDescription>Top {Math.min(state.places.length, 6)} by frequency.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {state.places.slice(0, 6).map((p) => (
              <Chip key={p.id}>
                {p.label} · {p.frequency}×
              </Chip>
            ))}
          </CardContent>
        </Card>
        <div className="mt-auto pt-6">
          <Button size="lg" className="w-full" onClick={() => onDone(state.places)}>
            Continue <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="text-center">
        <Mascot variant="idle" size={120} />
        <h2 className="text-h2 text-ink-strong mt-4">
          Maps Takeout - <em className="text-ink-soft not-italic">optional</em>
        </h2>
        <p className="mt-1 text-body text-ink-soft">
          Drop your Google Maps Takeout JSON to unlock the "4 min from your usual
          coffee spot" beat.
        </p>
      </header>

      <label className="border-2 border-dashed border-sky-300 rounded-3xl p-8 text-center bg-white hover:bg-sky-100 transition-colors cursor-pointer">
        <MapPinned className="h-8 w-8 text-sky-400 mx-auto" aria-hidden />
        <span className="block mt-3 text-body font-semibold text-ink-strong">
          Choose Takeout JSON
        </span>
        <span className="block text-caption text-ink-soft">
          Or tap Use sample below.
        </span>
        <input
          type="file"
          accept="application/json,.json,.zip"
          className="sr-only"
          onChange={(e) => handleFile(e.currentTarget.files?.[0])}
        />
      </label>

      <div className="mt-auto pt-6 flex flex-col gap-2">
        <Button variant="secondary" onClick={() => handleFile(undefined)}>
          Use sample Takeout
        </Button>
        <Button variant="ghost" onClick={() => onDone(null)}>
          <SkipForward className="h-4 w-4" aria-hidden /> Skip
        </Button>
      </div>
    </div>
  );
}
