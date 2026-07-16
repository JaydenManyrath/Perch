"use client";

import type { Verdict } from "@/lib/types/contract";
import { rankSummaries } from "@/lib/negotiate/scouts";
import { VERDICT_STYLE } from "./verdictStyle";
import type { ListingState } from "./ListingVerdictCard";

const INK_STRONG = "#2C4A63";
const INK_SOFT = "#5E7E97";

/**
 * Final ranked roll-up, sorted CLIENT-SIDE from the collected listing_summary events
 * (contract section 4.3: `done` carries no payload, so the screen owns the sort). Uses the
 * same deterministic `rankSummaries` as the server so ordering is identical.
 */
export function ResultsSummary({ listings }: { listings: ListingState[] }) {
  const withSummary = listings.filter((l) => l.summary);
  if (withSummary.length === 0) return null;

  const ranked = rankSummaries(
    withSummary.map((l) => ({
      listingId: l.listingId,
      overall: l.summary!.overall as Verdict,
      passedChecks: l.summary!.passedChecks,
      totalChecks: l.summary!.totalChecks,
      title: l.title,
    })),
  );

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: INK_STRONG, marginBottom: 8 }}>
        Ranked perches
      </h2>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
        {ranked.map((r, i) => {
          const s = VERDICT_STYLE[r.overall];
          return (
            <li
              key={r.listingId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 10,
                background: "#FFFFFF",
                border: "1px solid #DCEFFB",
              }}
            >
              <span style={{ fontWeight: 700, color: INK_SOFT, width: 20 }}>{i + 1}</span>
              <span style={{ flex: 1, color: INK_STRONG, fontWeight: 600 }}>{r.title}</span>
              <span style={{ fontSize: 12, color: INK_SOFT }}>
                {r.passedChecks}/{r.totalChecks}
              </span>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: s.fg }} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
