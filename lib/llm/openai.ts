import { NEGOTIATE_SYSTEM, negotiateUserPrompt, REASON_SYSTEM } from "./prompts";
import type { ScoutResult } from "@/lib/negotiate/types";

/**
 * LLM narration (additive only). Every function degrades safely: if `LLM_DISABLED=1`
 * or no API key is set, negotiation streams no prose and reasons fall back to their
 * deterministic templates. The model NEVER decides a verdict, number, or ordering.
 */

export function isLlmEnabled(): boolean {
  return process.env.LLM_DISABLED !== "1" && !!process.env.OPENAI_API_KEY;
}

function model() {
  // Lazy import so the AI SDK/provider is only touched when actually enabled.
  return import("@ai-sdk/openai").then(({ openai }) =>
    openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
  );
}

/**
 * Stream a one-to-two sentence explanation for a listing's (already-decided)
 * verdicts. Yields text chunks. Returns immediately (yields nothing) when disabled.
 */
export async function* streamListingNarration(
  title: string,
  overall: string,
  results: ScoutResult[],
): AsyncGenerator<string> {
  if (!isLlmEnabled()) return;
  try {
    const { streamText } = await import("ai");
    const result = streamText({
      model: await model(),
      system: NEGOTIATE_SYSTEM,
      prompt: negotiateUserPrompt(title, overall, results),
      temperature: 0.4,
      maxTokens: 120,
    });
    for await (const delta of result.textStream) {
      yield delta;
    }
  } catch (err) {
    // Narration is additive — a model failure must never break the deterministic stream.
    console.error("streamListingNarration failed (continuing without prose):", err);
  }
}

/**
 * Polish deterministic reason chips into one friendly sentence. Returns null when
 * disabled or on any failure, so callers keep the deterministic template.
 */
export async function polishReason(reasons: string[]): Promise<string | null> {
  if (!isLlmEnabled() || reasons.length === 0) return null;
  try {
    const { generateText } = await import("ai");
    const { text } = await generateText({
      model: await model(),
      system: REASON_SYSTEM,
      prompt: reasons.join("; "),
      temperature: 0.5,
      maxTokens: 60,
    });
    return text.trim() || null;
  } catch (err) {
    console.error("polishReason failed (using deterministic template):", err);
    return null;
  }
}
