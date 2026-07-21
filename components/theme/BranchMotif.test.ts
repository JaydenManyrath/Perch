import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BranchMotif, type BranchMotifVariant } from "@/components/theme/BranchMotif";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const VARIANTS: BranchMotifVariant[] = ["rail", "corner", "perch"];

function render(variant: BranchMotifVariant, className?: string) {
  return renderToStaticMarkup(React.createElement(BranchMotif, { variant, className }));
}

/**
 * RD52 - the branch motif is decorative and cheap. This test is the guardrail
 * for the mascot-filter lesson (docs/ARCHITECTURE.md): no SVG filters, never
 * intercepts pointer events, always aria-hidden, token colors only (no raw hex).
 */
describe("BranchMotif (RD52)", () => {
  it("renders every variant as a decorative, non-interactive svg", () => {
    for (const variant of VARIANTS) {
      const html = render(variant);
      expect(html).toContain("<svg");
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('focusable="false"');
      expect(html).toContain("pointer-events-none");
    }
  });

  it("uses NO expensive SVG filters (the mascot-filter lesson)", () => {
    for (const variant of VARIANTS) {
      const html = render(variant).toLowerCase();
      expect(html).not.toContain("feturbulence");
      expect(html).not.toContain("fedisplacementmap");
      expect(html).not.toContain("fegaussianblur");
      expect(html).not.toContain("<filter");
      expect(html).not.toContain("filter=");
    }
  });

  it("paints in frozen tokens via tailwind utilities, never raw hex", () => {
    for (const variant of VARIANTS) {
      const html = render(variant);
      // baby-blue line work + soft leaves + one warm accent bud (section 3 tokens).
      expect(html).toContain("stroke-sky-300");
      expect(html).toContain("fill-sky-200");
      expect(html).toContain("fill-accent-beakLight");
      // No inlined hex color values anywhere.
      expect(html).not.toContain("#");
    }
  });

  it("forwards caller positioning classes so placements stay behind content", () => {
    const html = render("rail", "absolute -z-10 opacity-60");
    expect(html).toContain("absolute");
    expect(html).toContain("-z-10");
    expect(html).toContain("opacity-60");
    // the base decorative classes survive the merge
    expect(html).toContain("pointer-events-none");
  });

  it("gives each variant its own viewBox aspect", () => {
    const boxes = VARIANTS.map((v) => render(v).match(/viewBox="([^"]+)"/)?.[1]);
    expect(new Set(boxes).size).toBe(VARIANTS.length);
  });
});
