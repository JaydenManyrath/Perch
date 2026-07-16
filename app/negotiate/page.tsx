"use client";

import { useState } from "react";
import type { NegotiateRequest } from "@/lib/types/contract";
import { ScoutStream } from "./_components/ScoutStream";

const INK_STRONG = "#2C4A63";
const INK_SOFT = "#5E7E97";

/**
 * B10 negotiation hero - the single UI surface Person B owns end-to-end. Collect an
 * offer + shortlist, then stream deterministic scout verdicts with live narration and
 * a ranked results screen. Inputs default to the seeded demo so the flow is one click.
 */
export default function NegotiatePage() {
  const [listingIds, setListingIds] = useState("");
  const [budget, setBudget] = useState(2000);
  const [request, setRequest] = useState<NegotiateRequest | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ids = listingIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    setRequest({
      listingIds: ids,
      constraints: {
        monthlyBudget: budget,
        moveIn: "2026-06-08",
        moveOut: "2026-08-14",
        routineAnchors: [{ label: "usual coffee spot", lat: 47.615, lng: -122.34 }],
      },
    });
  };

  return (
    <main style={{ padding: "2.5rem 1.25rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: INK_STRONG }}>Housing negotiation</h1>
      <p style={{ color: INK_SOFT, marginTop: 4 }}>
        Scouts check each perch - budget, safety, lease fit, routine fit - with real
        numbers. The chick handles the waiting; the numbers stay serious.
      </p>

      {!request ? (
        <form onSubmit={submit} style={{ marginTop: 20, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, color: INK_SOFT }}>
              Listing IDs (comma-separated - from your shortlist / seed)
            </span>
            <input
              value={listingIds}
              onChange={(e) => setListingIds(e.target.value)}
              placeholder="e.g. 3f2a..., 9b1c..."
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #9CC5DD" }}
            />
          </label>
          <label style={{ display: "grid", gap: 4, maxWidth: 220 }}>
            <span style={{ fontSize: 13, color: INK_SOFT }}>Monthly budget (USD)</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #9CC5DD" }}
            />
          </label>
          <button
            type="submit"
            style={{
              justifySelf: "start",
              background: "#5E9BCB",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Continue
          </button>
        </form>
      ) : (
        <div style={{ marginTop: 20 }}>
          <ScoutStream request={request} />
        </div>
      )}
    </main>
  );
}
