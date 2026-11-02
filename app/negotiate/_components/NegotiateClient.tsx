"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NegotiateRequest } from "@/lib/types/contract";
import { ScoutStream } from "./ScoutStream";

const INK_STRONG = "#2C4A63";
const INK_SOFT = "#5E7E97";
const SKY_100 = "#DCEFFB";
const SKY_300 = "#9CC5DD";
const SKY_500 = "#5E9BCB";

/** The minimal shape the picker needs from a perch. */
export type PickablePerch = { id: string; title: string; address: string; price: number };

const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * B10 negotiation hero - client surface. Instead of pasting raw listing UUIDs, the
 * intern picks from their own saved perches (falls back to the fresh deck). Up to three
 * are preselected so the hero is one click for the demo. Deterministic scout verdicts
 * then stream in via ScoutStream.
 */
/** Default stay length when only the move-in date is known (a typical 10-week internship). */
const DEFAULT_STAY_DAYS = 70;

const isIsoDate = (v: string | null | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** ISO date plus whole days, at UTC midnight. */
export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** The stay the scouts check: from the intern's move-in date, editable on the form. */
export function defaultStay(moveInDate: string | null | undefined, today = new Date()): { moveIn: string; moveOut: string } {
  const moveIn = isIsoDate(moveInDate) ? moveInDate : today.toISOString().slice(0, 10);
  return { moveIn, moveOut: addDays(moveIn, DEFAULT_STAY_DAYS) };
}

export function NegotiateClient({ perches, moveInDate }: { perches: PickablePerch[]; moveInDate?: string | null }) {
  const [selected, setSelected] = useState<string[]>(() =>
    perches.slice(0, 3).map((p) => p.id),
  );
  const [budget, setBudget] = useState(2000);
  const [stay, setStay] = useState(() => defaultStay(moveInDate));
  const stayValid = isIsoDate(stay.moveIn) && isIsoDate(stay.moveOut) && stay.moveIn <= stay.moveOut;
  const [request, setRequest] = useState<NegotiateRequest | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // Preserve the on-screen order when we build the request.
  const orderedIds = useMemo(
    () => perches.filter((p) => selected.includes(p.id)).map((p) => p.id),
    [perches, selected],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderedIds.length === 0 || !stayValid) return;
    setRequest({
      listingIds: orderedIds,
      constraints: {
        monthlyBudget: budget,
        moveIn: stay.moveIn,
        moveOut: stay.moveOut,
        routineAnchors: [{ label: "usual coffee spot", lat: 47.615, lng: -122.34 }],
      },
    });
  };

  if (request) {
    return (
      <div style={{ marginTop: 20 }}>
        <ScoutStream request={request} />
      </div>
    );
  }

  if (perches.length === 0) {
    return (
      <div
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 14,
          background: "#FFFFFF",
          border: `1px solid ${SKY_300}`,
        }}
      >
        <p style={{ color: INK_STRONG, fontWeight: 600 }}>No perches to scout yet.</p>
        <p style={{ color: INK_SOFT, marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>
          Swipe through sublets and save a few first, then the scouts can vet them for
          you.
        </p>
        <Link
          href="/stories"
          style={{
            display: "inline-block",
            marginTop: 12,
            background: SKY_500,
            color: "#FFFFFF",
            textDecoration: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontWeight: 700,
          }}
        >
          Browse perches
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 20, display: "grid", gap: 16 }}>
      <fieldset style={{ border: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        <legend style={{ fontSize: 13, color: INK_SOFT, marginBottom: 4 }}>
          Which perches should the scouts check?
        </legend>
        {perches.map((p) => {
          const checked = selected.includes(p.id);
          return (
            <label
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                cursor: "pointer",
                background: checked ? SKY_100 : "#FFFFFF",
                border: `1px solid ${checked ? SKY_500 : SKY_300}`,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(p.id)}
                style={{ width: 16, height: 16, accentColor: SKY_500 }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontWeight: 700,
                    color: INK_STRONG,
                    fontSize: 14,
                  }}
                >
                  {p.title}
                </span>
                {p.address ? (
                  <span style={{ display: "block", fontSize: 12, color: INK_SOFT }}>
                    {p.address}
                  </span>
                ) : null}
              </span>
              <span style={{ fontWeight: 700, color: INK_STRONG, fontSize: 14 }}>
                {usd(p.price)}/mo
              </span>
            </label>
          );
        })}
      </fieldset>

      <label style={{ display: "grid", gap: 4, maxWidth: 220 }}>
        <span style={{ fontSize: 13, color: INK_SOFT }}>Monthly budget (USD)</span>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${SKY_300}` }}
        />
      </label>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: INK_SOFT }}>Move in</span>
          <input
            type="date"
            value={stay.moveIn}
            onChange={(e) => setStay((s) => ({ ...s, moveIn: e.target.value }))}
            style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${SKY_300}` }}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: INK_SOFT }}>Move out</span>
          <input
            type="date"
            value={stay.moveOut}
            onChange={(e) => setStay((s) => ({ ...s, moveOut: e.target.value }))}
            style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${SKY_300}` }}
          />
        </label>
      </div>
      {!stayValid ? (
        <p role="alert" style={{ color: INK_STRONG, fontSize: 13, margin: 0 }}>
          Move out can't be before move in.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={orderedIds.length === 0 || !stayValid}
        style={{
          justifySelf: "start",
          background: orderedIds.length === 0 || !stayValid ? SKY_300 : SKY_500,
          color: "#FFFFFF",
          border: "none",
          borderRadius: 10,
          padding: "10px 18px",
          fontWeight: 700,
          cursor: orderedIds.length === 0 || !stayValid ? "not-allowed" : "pointer",
        }}
      >
        Send the scouts{orderedIds.length ? ` (${orderedIds.length})` : ""}
      </button>
    </form>
  );
}
