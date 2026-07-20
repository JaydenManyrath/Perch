/**
 * LIVE offer-parsing smoke test (RC53) - exercises the REAL OpenAI structured-output
 * path (generateObject), not the mocked pipeline. Gated: runs only with LIVE_LLM=1 and a
 * key present, so the default `npm test` never spends money. Loads .env.local for the key.
 *
 *   LIVE_LLM=1 npx vitest run tests/offer-llm-live.test.ts
 *
 * It proves the model reads a real-shaped PDF into the right fields AND that the
 * deterministic verification layer trusts them (nothing grounded gets nulled, nothing
 * ungrounded survives).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { extractOfferPdfText, parseOfferText } from "@/lib/parsers/offerLetter";
import { extractOfferWithLlm } from "@/lib/parsers/offerLlm";
import { verifyOffer, mergeOffers, numbersInText } from "@/lib/parsers/offerVerify";

config({ path: ".env.local" });

const enabled = process.env.LIVE_LLM === "1" && !!process.env.OPENAI_API_KEY;
const maybe = enabled ? it : it.skip;

describe("live offer parsing (real model)", () => {
  maybe(
    "reads the classic letter into grounded, verified fields",
    async () => {
      const pdf = readFileSync(join(process.cwd(), "tests", "fixtures", "offers", "classic-letter.pdf"));
      const text = await extractOfferPdfText(pdf);
      expect(text).toContain("Stripe");

      const llm = await extractOfferWithLlm(text); // real generateObject call
      const verified = verifyOffer(llm, text);
      const merged = mergeOffers(parseOfferText(text), verified);
      console.log("LLM offer parse:", JSON.stringify(merged));

      // The model read the real numbers/strings...
      expect(merged.salary).toBe(126000);
      expect((merged.employer ?? "").toLowerCase()).toContain("stripe");
      expect(merged.startDate).toBe("2026-06-08");
      // ...and verification trusted the grounded salary (not flagged).
      expect(merged.needsReview).not.toContain("salary");

      // Nothing survived that is not grounded in the source text.
      const numbers = numbersInText(text);
      for (const v of [merged.salary, merged.relocationStipend, merged.signingBonus]) {
        if (v !== null) expect(numbers.has(v)).toBe(true);
      }
    },
    30_000,
  );
});
