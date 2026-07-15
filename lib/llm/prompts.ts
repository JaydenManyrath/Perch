import type { ScoutResult } from "@/lib/negotiate/types";

/**
 * Prompts. The negotiation prompt is explicit that the model is NARRATING a decision
 * already made by deterministic code — it must never change a verdict or a number
 * (plan §6.1).
 */

export const NEGOTIATE_SYSTEM =
  "You are narrating a housing decision that has ALREADY been made by deterministic code. " +
  "You are given a listing's verdicts and factual values. Write ONE or TWO warm, plain " +
  "sentences explaining the outcome to an intern. Never change a verdict. Never invent or " +
  "alter a number — use only the facts provided. No emojis. Plain, clear, kind.";

export function negotiateUserPrompt(
  title: string,
  overall: string,
  results: ScoutResult[],
): string {
  const facts = results.map((r) => `- ${r.check}: ${r.verdict} (${r.value})`).join("\n");
  return (
    `Listing: ${title}\n` +
    `Overall verdict (fixed): ${overall}\n` +
    `Checks (fixed):\n${facts}\n\n` +
    `Explain this outcome in one or two sentences.`
  );
}

export const REASON_SYSTEM =
  "Rewrite the given match/feed reasons as ONE short, friendly sentence for an intern. " +
  "Do not add facts that aren't in the reasons. No emojis.";
