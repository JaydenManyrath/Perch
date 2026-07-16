"use client";

import { useCallback, useRef, useState } from "react";
import type { NegotiateRequest, NegotiateStreamEvent } from "@/lib/types/contract";
import { Mascot } from "@/components/mascot/Mascot";
import { ListingVerdictCard, type ListingState } from "./ListingVerdictCard";
import { ResultsSummary } from "./ResultsSummary";

type Status = "idle" | "streaming" | "done" | "error";

/**
 * Subscribes to the POST /api/negotiate NDJSON stream and renders each listing card
 * filling in live as verdicts arrive (contract section 4.3 ordering). Ranking is computed
 * client-side in ResultsSummary from the collected listing_summary events.
 */
export function ScoutStream({ request }: { request: NegotiateRequest }) {
  const [byId, setById] = useState<Record<string, ListingState>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const apply = useCallback((ev: NegotiateStreamEvent) => {
    setById((prev) => {
      const next = { ...prev };
      switch (ev.type) {
        case "listing_start":
          next[ev.listingId] = {
            listingId: ev.listingId,
            title: ev.title,
            verdicts: [],
            explanation: "",
          };
          setOrder((o) => (o.includes(ev.listingId) ? o : [...o, ev.listingId]));
          break;
        case "scout_verdict":
          if (next[ev.listingId]) {
            next[ev.listingId] = {
              ...next[ev.listingId],
              verdicts: [
                ...next[ev.listingId].verdicts.filter((v) => v.check !== ev.check),
                { check: ev.check, verdict: ev.verdict, value: ev.value },
              ],
            };
          }
          break;
        case "explanation_delta":
          if (next[ev.listingId]) {
            next[ev.listingId] = {
              ...next[ev.listingId],
              explanation: next[ev.listingId].explanation + ev.textDelta,
            };
          }
          break;
        case "listing_summary":
          if (next[ev.listingId]) {
            next[ev.listingId] = { ...next[ev.listingId], summary: ev };
          }
          break;
        case "done":
          break;
      }
      return next;
    });
  }, []);

  const start = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStatus("streaming");
    setError(null);

    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Negotiate failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) apply(JSON.parse(trimmed) as NegotiateStreamEvent);
        }
      }
      if (buffer.trim()) apply(JSON.parse(buffer.trim()) as NegotiateStreamEvent);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "stream error");
      setStatus("error");
    }
  }, [apply, request]);

  const listings = order.map((id) => byId[id]).filter(Boolean);

  return (
    <div>
      {status === "idle" ? (
        <button
          onClick={start}
          style={{
            background: "#5E9BCB",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Send the scouts
        </button>
      ) : null}

      {status === "streaming" ? (
        <div style={{ margin: "8px 0 20px" }}>
          <Mascot variant="hop" size={72} caption="Scouting your perches..." />
        </div>
      ) : null}

      {status === "error" ? (
        <p style={{ color: "#DC2626", fontWeight: 600 }}>
          {error}: is the backend seeded and are you signed in?
        </p>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {listings.map((l) => (
          <ListingVerdictCard key={l.listingId} state={l} />
        ))}
      </div>

      {status === "done" ? <ResultsSummary listings={listings} /> : null}
    </div>
  );
}
