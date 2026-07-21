import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountStep, type AccountAssist } from "@/app/onboarding/_steps/AccountStep";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

/**
 * The account mint is VISIBLE: while minting the user sees who the account is for;
 * on success they see the minted email they can log in with later; on any fallback
 * they see a plain note that the demo persona stands in - never a silent swap.
 * Decision moment: no mascot renders here.
 */
describe("AccountStep - visible account-creation assist", () => {
  function render(assist: AccountAssist) {
    return renderToStaticMarkup(
      React.createElement(AccountStep, { assist, onContinue: () => {} }),
    );
  }

  it("shows who the account is being created for while minting", () => {
    const html = render({ phase: "creating", name: "Dana Whitfield" });
    expect(html).toContain("Creating your account for Dana Whitfield...");
  });

  it("stays sensible when the letter had no name", () => {
    const html = render({ phase: "creating", name: "" });
    expect(html).toContain("Creating your account...");
    expect(html).not.toContain("account for");
  });

  it("confirms the minted email and that it is the login for next time", () => {
    const html = render({
      phase: "created",
      name: "Dana Whitfield",
      email: "dana-whitfield@perch.demo",
    });
    expect(html).toContain("Account created:");
    expect(html).toContain("dana-whitfield@perch.demo");
    expect(html).toContain("log in next time");
    expect(html).toContain("Signed in as Dana Whitfield.");
    expect(html).toContain("Continue");
  });

  it("says plainly when the demo persona stands in - no silent swap", () => {
    const html = render({ phase: "fallback", name: "Dana Whitfield" });
    expect(html).toContain("No live account was created");
    expect(html).toContain("demo persona is being used instead");
    expect(html).toContain("Continue");
  });

  it("keeps the mascot off this decision moment", () => {
    for (const assist of [
      { phase: "creating", name: "Dana" },
      { phase: "created", name: "Dana", email: "dana@perch.demo" },
      { phase: "fallback", name: "Dana" },
    ] as AccountAssist[]) {
      // The Mascot component renders role="img"; no image belongs on this screen.
      expect(render(assist)).not.toContain('role="img"');
    }
  });
});
