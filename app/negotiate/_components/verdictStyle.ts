import type { Verdict } from "@/lib/types/contract";

/**
 * Verdict to color. Straight from docs/ARCHITECTURE.mdfunctional tokens, kept
 * UNMUTED (never pastel-ify a warning). The pale *Bg values are backgrounds only,
 * paired with the strong foreground for the label. Inline hex is used deliberately so
 * these stay correct regardless of Tailwind's purge - decision surfaces must be legible.
 */
export const VERDICT_STYLE: Record<Verdict, { fg: string; bg: string; label: string }> = {
  pass: { fg: "#16A34A", bg: "#DCFCE7", label: "Lands" }, // func.pass / func.passBg
  flag: { fg: "#D97706", bg: "#FEF3C7", label: "Caution" }, // func.flag / func.flagBg
  fail: { fg: "#DC2626", bg: "#FEE2E2", label: "Skip" }, // func.scam / func.scamBg
};

export const CHECK_LABEL: Record<string, string> = {
  budget: "Budget",
  safety: "Safety",
  lease_fit: "Lease fit",
  routine_fit: "Routine fit",
};
