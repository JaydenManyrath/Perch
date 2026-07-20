import { describe, expect, it } from "vitest";
import { navItems } from "@/components/shell/nav-items";

describe("shell navigation identity", () => {
  it("builds the profile destination from the current session user", () => {
    const profile = navItems("auth-user-1").find((item) => item.label === "Nest");

    expect(profile?.href).toBe("/profile/auth-user-1");
  });

  it("uses the data-source-safe me route until a session user is available", () => {
    const profile = navItems().find((item) => item.label === "Nest");

    expect(profile?.href).toBe("/profile/me");
  });
});
