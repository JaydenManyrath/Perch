import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvatarStepView } from "@/app/onboarding/_steps/AvatarStep";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

/**
 * RA52: the profile picture is OPTIONAL end to end. These pin that skipping is a
 * one-tap control, that no image is required (initials render instead), and that a
 * chosen photo previews without breaking.
 */
describe("AvatarStep (RA52) - optional profile picture", () => {
  function render(previewUrl: string | null, busy = false) {
    return renderToStaticMarkup(
      React.createElement(AvatarStepView, {
        name: "Alex Chen",
        previewUrl,
        busy,
        onChoose: () => {},
        onDone: () => {},
      }),
    );
  }

  it("makes clear the step is optional and offers a one-tap skip", () => {
    const html = render(null);
    expect(html).toContain("optional");
    expect(html).toContain("Skip");
  });

  it("shows the initials fallback (no broken image) when no photo is chosen", () => {
    const html = render(null);
    expect(html).toContain("AC");
    expect(html).not.toContain("<img");
    expect(html).toContain("Choose a photo");
  });

  it("previews a chosen photo without requiring an upload", () => {
    const html = render("blob:preview-123");
    expect(html).toContain("<img");
    expect(html).toContain("blob:preview-123");
    expect(html).toContain("Choose a different photo");
  });

  it("does not gate completion on having a photo (Continue is always present)", () => {
    expect(render(null)).toContain("Continue");
    expect(render("blob:preview-123")).toContain("Looks good");
  });
});
