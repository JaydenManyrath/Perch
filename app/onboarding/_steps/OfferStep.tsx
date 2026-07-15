"use client";

import { useState } from "react";
import { Upload, FileText, ArrowRight } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card, CardContent } from "@/components/ui/Card";
import { parseOffer } from "@/lib/data/source";
import type { OfferParse } from "@/lib/types/contract";
import { formatMonthDay } from "@/lib/utils";

/**
 * Step 1 — Offer letter. Mascot appears in the waiting beat; the parsed
 * result renders clean (no mascot over money/dates), CLAUDE.md §9.
 */
export function OfferStep({
  onDone,
}: {
  onDone: (offer: OfferParse) => void;
}) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "reading" }
    | { kind: "done"; offer: OfferParse }
  >({ kind: "idle" });

  async function handleFile(file?: File) {
    setState({ kind: "reading" });
    const offer = await parseOffer(file);
    setState({ kind: "done", offer });
  }

  if (state.kind === "reading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <Mascot variant="hop" size={160} />
        <div>
          <h2 className="text-h2 text-ink-strong">Reading your offer…</h2>
          <p className="mt-1 text-body text-ink-soft">
            Extracting employer, role, dates and salary.
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === "done") {
    const o = state.offer;
    return (
      <div className="flex-1 flex flex-col gap-6">
        <header>
          <h2 className="text-h2 text-ink-strong">Here's what we got</h2>
          <p className="mt-1 text-body text-ink-soft">
            Edit anything that doesn't look right.
          </p>
        </header>

        {/* Decision content — no mascot over the numbers. */}
        <Card>
          <CardContent className="p-4 grid grid-cols-2 gap-3">
            <Field label="Employer" value={o.employer} />
            <Field label="Role" value={o.role ?? "—"} />
            <Field
              label="Salary (annual)"
              value={o.salary ? `$${o.salary.toLocaleString()}` : "—"}
            />
            <Field label="City" value={o.city ?? "—"} />
            <Field
              label="Start"
              value={o.startDate ? formatMonthDay(o.startDate) : "—"}
            />
            <Field
              label="End"
              value={o.endDate ? formatMonthDay(o.endDate) : "—"}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-1.5">
          <Chip>Deterministic extraction</Chip>
          <Chip tone="muted">LLM only normalizes ambiguous fields — never invents numbers</Chip>
        </div>

        <div className="mt-auto pt-6">
          <Button size="lg" className="w-full" onClick={() => onDone(o)}>
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
        <h2 className="text-h2 text-ink-strong mt-4">Upload your offer letter</h2>
        <p className="mt-1 text-body text-ink-soft">
          So we know when and where you're landing. PDFs only. Stored privately.
        </p>
      </header>

      <label
        className="border-2 border-dashed border-sky-300 rounded-3xl p-8 text-center bg-white hover:bg-sky-100 transition-colors cursor-pointer"
      >
        <FileText className="h-8 w-8 text-sky-400 mx-auto" aria-hidden />
        <span className="block mt-3 text-body font-semibold text-ink-strong">
          Choose a PDF
        </span>
        <span className="block text-caption text-ink-soft">
          Or tap Continue to demo with a sample offer.
        </span>
        <input
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => handleFile(e.currentTarget.files?.[0])}
        />
      </label>

      <div className="mt-auto pt-6 flex gap-2">
        <Button
          variant="secondary"
          onClick={() => handleFile(undefined)}
          className="flex-1"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Use sample offer
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-ink-soft">{label}</dt>
      <dd className="text-body text-ink-strong font-semibold mt-0.5">{value}</dd>
    </div>
  );
}
