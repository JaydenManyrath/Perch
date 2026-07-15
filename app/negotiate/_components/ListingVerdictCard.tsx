"use client";

import type { NegotiateStreamEvent, ScoutCheck, Verdict } from "@/lib/types/contract";
import { VERDICT_STYLE, CHECK_LABEL } from "./verdictStyle";

export type ListingState = {
  listingId: string;
  title: string;
  verdicts: { check: ScoutCheck; verdict: Verdict; value: string }[];
  explanation: string;
  summary?: Extract<NegotiateStreamEvent, { type: "listing_summary" }>;
};

const INK_STRONG = "#2C4A63";
const INK_SOFT = "#5E7E97";
const SKY_100 = "#DCEFFB";
const SKY_300 = "#9CC5DD";

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span
      style={{
        color: s.fg,
        background: s.bg,
        fontWeight: 700,
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 999,
        textTransform: "uppercase",
        letterSpacing: 0.3,
      }}
    >
      {s.label}
    </span>
  );
}

/**
 * A single listing card that fills in live as scout verdicts arrive. Numbers are
 * rendered as a clean, serious, information-first surface — no mascot here (decision
 * surface, CLAUDE.md §9). When the overall verdict is `pass`, the card gets the
 * "lands into tray" settle animation (stub CSS transition until A's motion primitive
 * merges — plan §2.2).
 */
export function ListingVerdictCard({ state }: { state: ListingState }) {
  const overall = state.summary?.overall;
  const landed = overall === "pass";

  return (
    <article
      data-landed={landed ? "true" : "false"}
      style={{
        background: "#FFFFFF",
        border: `1px solid ${overall ? VERDICT_STYLE[overall].fg : SKY_300}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: landed ? "0 8px 24px rgba(22,163,74,0.15)" : "0 1px 2px rgba(44,74,99,0.06)",
        transform: landed ? "translateY(-2px)" : "none",
        transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: INK_STRONG }}>{state.title}</h3>
        {overall ? <VerdictPill verdict={overall} /> : (
          <span style={{ fontSize: 12, color: INK_SOFT }}>scouting…</span>
        )}
      </header>

      <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 6 }}>
        {state.verdicts.map((v) => {
          const s = VERDICT_STYLE[v.verdict];
          return (
            <li
              key={v.check}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 8,
                background: SKY_100,
              }}
            >
              <span style={{ fontSize: 13, color: INK_SOFT, minWidth: 84 }}>
                {CHECK_LABEL[v.check] ?? v.check}
              </span>
              <span style={{ fontSize: 13, color: INK_STRONG, flex: 1, textAlign: "right" }}>
                {v.value}
              </span>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: s.fg }} aria-label={v.verdict} />
            </li>
          );
        })}
      </ul>

      {state.explanation ? (
        <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: INK_STRONG }}>
          {state.explanation}
        </p>
      ) : null}

      {state.summary ? (
        <footer style={{ marginTop: 10, fontSize: 12, color: INK_SOFT }}>
          {state.summary.passedChecks}/{state.summary.totalChecks} checks passed
        </footer>
      ) : null}
    </article>
  );
}
