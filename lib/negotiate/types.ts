import type { ScoutCheck, Verdict } from "@/lib/types/contract";

/** A listing as the deterministic scouts see it (subset of the DB row). */
export type ScoutListing = {
  id: string;
  title: string;
  price: number; // USD/mo
  lat: number | null;
  lng: number | null;
  lease_start: string | null; // ISO date
  lease_end: string | null; // ISO date
  safety_flags: { scamSignals: string[]; notes: string[] };
};

/** Constraints from the negotiate request (contract §4.3). */
export type ScoutConstraints = {
  monthlyBudget: number;
  moveIn: string; // ISO date
  moveOut: string; // ISO date
  salary?: number | null; // annual USD from parsed offer (B6); optional
  costOfLivingIndex?: number | null; // 100 = national average; optional (section 13.5)
  routineAnchors?: { label: string; lat: number; lng: number }[];
};

/**
 * A single scout's deterministic result. `value` is the ONLY string the LLM may
 * phrase around — it may never change `verdict`. `check` + `verdict` are the frozen
 * contract §4.3 vocabulary.
 */
export type ScoutResult = {
  check: ScoutCheck;
  verdict: Verdict;
  value: string;
};
