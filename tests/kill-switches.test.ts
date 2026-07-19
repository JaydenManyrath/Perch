/**
 * Kill-switch + deterministic-fallback contract (RB47).
 *
 * The paid/external backends (OpenAI narration, Composio Spotify) must ALWAYS have
 * a deterministic path that engages when a key is absent or a kill switch is set,
 * so go-live never turns a missing key into a crash (contract 14.2). This pins:
 *   - isLlmEnabled() is false unless a real key is present AND LLM_DISABLED != 1;
 *   - isComposioEnabled() is false unless a real key is present AND COMPOSIO_DISABLED != 1;
 *   - the deterministic taste fallback loads without any key (no throw).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isLlmEnabled } from "@/lib/llm/openai";
import { isComposioEnabled, fallbackTaste } from "@/lib/composio/spotify";

const snapshot = { ...process.env };
afterEach(() => {
  process.env = { ...snapshot };
});
beforeEach(() => {
  delete process.env.LLM_DISABLED;
  delete process.env.OPENAI_API_KEY;
  delete process.env.COMPOSIO_DISABLED;
  delete process.env.COMPOSIO_API_KEY;
});

describe("LLM kill switch (isLlmEnabled)", () => {
  it("is disabled with no OPENAI_API_KEY (deterministic default)", () => {
    expect(isLlmEnabled()).toBe(false);
  });
  it("stays disabled when LLM_DISABLED=1 even with a key present", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.LLM_DISABLED = "1";
    expect(isLlmEnabled()).toBe(false);
  });
  it("is enabled only with a key and the switch off", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(isLlmEnabled()).toBe(true);
  });
});

describe("Composio kill switch (isComposioEnabled)", () => {
  it("is disabled with no COMPOSIO_API_KEY (fixture-taste default)", () => {
    expect(isComposioEnabled()).toBe(false);
  });
  it("stays disabled when COMPOSIO_DISABLED=1 even with a key present", () => {
    process.env.COMPOSIO_API_KEY = "comp-test";
    process.env.COMPOSIO_DISABLED = "1";
    expect(isComposioEnabled()).toBe(false);
  });
  it("is enabled only with a key and the switch off", () => {
    process.env.COMPOSIO_API_KEY = "comp-test";
    expect(isComposioEnabled()).toBe(true);
  });
});

describe("deterministic fallback engages without any key", () => {
  it("fallbackTaste() returns a usable taste profile and never throws", () => {
    const taste = fallbackTaste();
    expect(Array.isArray(taste.topGenres)).toBe(true);
    expect(Array.isArray(taste.topArtists)).toBe(true);
  });
});
