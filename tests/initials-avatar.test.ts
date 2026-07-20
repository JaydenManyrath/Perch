import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  InitialsAvatar,
  initialsFromName,
  avatarToneFor,
} from "@/components/ui/InitialsAvatar";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

/**
 * RA53 acceptance: seeding a user with `avatar_url = null` (or empty) must produce
 * ZERO broken images across the app. The shared InitialsAvatar is that guarantee, so
 * these tests pin the null/empty fallback across sizes and the initials edge cases.
 */
describe("initialsFromName", () => {
  it("uses first + last initial for a full name", () => {
    expect(initialsFromName("Alex Chen")).toBe("AC");
    expect(initialsFromName("jordan kim")).toBe("JK");
  });

  it("uses a single initial for a one-word name", () => {
    expect(initialsFromName("Priya")).toBe("P");
  });

  it("never returns empty for null, empty, or whitespace names", () => {
    expect(initialsFromName(null)).toBe("?");
    expect(initialsFromName(undefined)).toBe("?");
    expect(initialsFromName("")).toBe("?");
    expect(initialsFromName("   ")).toBe("?");
  });

  it("collapses extra whitespace between names", () => {
    expect(initialsFromName("  Sam   Rivera  ")).toBe("SR");
  });
});

describe("avatarToneFor", () => {
  it("is deterministic for a given name", () => {
    expect(avatarToneFor("Alex Chen")).toBe(avatarToneFor("Alex Chen"));
  });

  it("always returns an on-theme sky token background", () => {
    for (const name of ["Alex Chen", "Jordan Kim", "Priya Menon", "", null]) {
      expect(avatarToneFor(name)).toMatch(/^bg-sky-(100|200|300)$/);
    }
  });
});

describe("InitialsAvatar rendering", () => {
  it("renders initials and NO image when src is null", () => {
    const html = renderToStaticMarkup(
      React.createElement(InitialsAvatar, { name: "Alex Chen", src: null, size: 40 }),
    );
    expect(html).toContain("AC");
    expect(html).not.toContain("<img");
  });

  it("renders initials and NO image when src is an empty string", () => {
    const html = renderToStaticMarkup(
      React.createElement(InitialsAvatar, { name: "Alex Chen", src: "", size: 40 }),
    );
    expect(html).toContain("AC");
    expect(html).not.toContain("<img");
  });

  it("renders the image when src is present (initials stay as the fallback layer)", () => {
    const html = renderToStaticMarkup(
      React.createElement(InitialsAvatar, {
        name: "Alex Chen",
        src: "https://example.com/a.png",
        size: 40,
      }),
    );
    expect(html).toContain("<img");
    expect(html).toContain("https://example.com/a.png");
    // The initials remain in the DOM beneath the image so a runtime load error
    // (onError) reveals a valid fallback rather than a broken circle.
    expect(html).toContain("AC");
  });

  it("keeps the null-src fallback intact across every swept size", () => {
    for (const size of [20, 28, 32, 36, 40, 44, 48, 56]) {
      const html = renderToStaticMarkup(
        React.createElement(InitialsAvatar, { name: "Nika Petrova", src: null, size }),
      );
      expect(html).not.toContain("<img");
      expect(html).toContain("NP");
      expect(html).toContain(`width:${size}px`);
      expect(html).toContain(`height:${size}px`);
    }
  });

  it("supports responsive className sizing (profile header) without an image", () => {
    const html = renderToStaticMarkup(
      React.createElement(InitialsAvatar, {
        name: "Alex Chen",
        src: null,
        className: "h-20 w-20 sm:h-24 sm:w-24",
        fallbackClassName: "text-h1",
      }),
    );
    expect(html).toContain("sm:h-24");
    expect(html).toContain("text-h1");
    expect(html).not.toContain("<img");
  });
});
