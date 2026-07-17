"use client";

import { useMemo, useState } from "react";
import { Upload, FileText, ArrowRight, AlertCircle } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card, CardContent } from "@/components/ui/Card";
import { FinanceBreakdownCard } from "@/components/finance/FinanceBreakdownCard";
import { parseOffer } from "@/lib/data/source";
import type { OfferField, OfferParse } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

/**
 * Step 1 - Offer letter (RA9 manual-correction).
 * Mascot appears in the waiting beat; the parsed result renders clean
 * (no mascot over money/dates). Low-confidence fields (needsReview) are
 * highlighted with a flag color and rendered as editable inputs on entry
 * so a bad OCR/parse never blocks the flow.
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
          <h2 className="text-h2 text-ink-strong">Reading your offer...</h2>
          <p className="mt-1 text-body text-ink-soft">
            Extracting employer, role, dates, and salary.
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === "done") {
    return (
      <OfferCorrection
        offer={state.offer}
        onContinue={(o) => onDone(o)}
      />
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

      <label className="border-2 border-dashed border-sky-300 rounded-3xl p-8 text-center bg-white hover:bg-sky-100 transition-colors cursor-pointer">
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

const FIELDS: { key: OfferField; label: string; type: "text" | "number" | "date" }[] = [
  { key: "employer", label: "Employer", type: "text" },
  { key: "role", label: "Role", type: "text" },
  { key: "salary", label: "Salary (annual USD)", type: "number" },
  { key: "relocationStipend", label: "Relocation stipend", type: "number" },
  { key: "signingBonus", label: "Signing bonus", type: "number" },
  { key: "city", label: "City", type: "text" },
  { key: "startDate", label: "Start date", type: "date" },
  { key: "endDate", label: "End date", type: "date" },
];

function OfferCorrection({
  offer,
  onContinue,
}: {
  offer: OfferParse;
  onContinue: (o: OfferParse) => void;
}) {
  const [values, setValues] = useState<Record<OfferField, string>>({
    employer: offer.employer ?? "",
    role: offer.role ?? "",
    salary: offer.salary != null ? String(offer.salary) : "",
    relocationStipend: offer.relocationStipend != null ? String(offer.relocationStipend) : "",
    signingBonus: offer.signingBonus != null ? String(offer.signingBonus) : "",
    startDate: offer.startDate ?? "",
    endDate: offer.endDate ?? "",
    city: offer.city ?? "",
  });
  const [reviewed, setReviewed] = useState<Set<OfferField>>(new Set());
  const needsReview = new Set(offer.needsReview ?? []);

  function set(key: OfferField, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    // As soon as the user edits a flagged field, mark it reviewed.
    if (needsReview.has(key)) setReviewed((r) => new Set(r).add(key));
  }

  function markReviewed(key: OfferField) {
    setReviewed((r) => new Set(r).add(key));
  }

  const outstanding = Array.from(needsReview).filter((k) => !reviewed.has(k));

  const currentOffer: OfferParse = useMemo(
    () => ({
      ...offer,
      employer: values.employer.trim() || offer.employer,
      role: values.role.trim() || null,
      salary: values.salary.trim() ? Number(values.salary) : null,
      relocationStipend: values.relocationStipend.trim() ? Number(values.relocationStipend) : null,
      signingBonus: values.signingBonus.trim() ? Number(values.signingBonus) : null,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      city: values.city.trim() || null,
      needsReview: outstanding,
    }),
    [values, offer, outstanding],
  );

  function submit() {
    onContinue(currentOffer);
  }

  return (
    <div className="flex-1 flex flex-col gap-4">
      <header>
        <h2 className="text-h2 text-ink-strong">Here's what we got</h2>
        <p className="mt-1 text-body text-ink-soft">
          Edit anything that doesn't look right. Fields we're less sure about
          are flagged - a quick check unblocks you.
        </p>
      </header>

      {outstanding.length > 0 ? (
        <div className="inline-flex items-center gap-2 rounded-2xl bg-func-flagBg text-func-flag px-3 py-2 border border-func-flagBg text-caption font-semibold">
          <AlertCircle className="h-4 w-4" aria-hidden strokeWidth={2.5} />
          {outstanding.length} field{outstanding.length === 1 ? "" : "s"} need a
          quick review before continuing.
        </div>
      ) : null}

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELDS.map((f) => {
            const flagged = needsReview.has(f.key) && !reviewed.has(f.key);
            return (
              <label key={f.key} className="block">
                <span className={cn(
                  "flex items-center gap-1 text-caption",
                  flagged ? "text-func-flag font-semibold" : "text-ink-soft",
                )}>
                  {flagged ? <AlertCircle className="h-3 w-3" aria-hidden strokeWidth={2.5} /> : null}
                  {f.label}
                  {flagged ? (
                    <span className="text-func-flag font-normal ml-1">
                      - check this
                    </span>
                  ) : null}
                </span>
                <input
                  type={f.type}
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  onBlur={() => markReviewed(f.key)}
                  aria-invalid={flagged}
                  className={cn(
                    "mt-1 w-full rounded-xl bg-white px-3 py-2 text-body text-ink-strong focus:outline-none focus:ring-2 focus:ring-sky-500",
                    flagged
                      ? "border-2 border-func-flag focus:ring-func-flag"
                      : "border border-sky-300 focus:border-sky-500",
                  )}
                />
              </label>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        <Chip>Deterministic extraction</Chip>
        <Chip tone="muted">LLM only normalizes ambiguous fields - never invents numbers</Chip>
        <Chip tone="accent">Your corrections proceed</Chip>
      </div>

      {/* Finance breakdown from the (possibly-edited) offer (RA35). */}
      <FinanceBreakdownCard offer={currentOffer} />


      <div className="mt-auto pt-4">
        <Button
          size="lg"
          className="w-full"
          onClick={submit}
          disabled={
            !values.employer.trim() ||
            !values.role.trim() ||
            !values.startDate ||
            outstanding.length > 0
          }
        >
          Continue <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        {outstanding.length > 0 ? (
          <p className="mt-2 text-caption text-ink-soft text-center">
            Confirm each flagged field to enable Continue.
          </p>
        ) : null}
      </div>
    </div>
  );
}
