import { describe, expect, it } from "vitest";
import { navItems, isActive } from "@/components/shell/nav-items";

/**
 * RD51 - the round-5 naming contract (docs/ARCHITECTURE.md).
 * Every tab wears its bird word as the label with a plain-meaning subtitle,
 * and ROUTES ARE FROZEN: the hrefs must stay byte-identical so deep links
 * never break. This test is the guardrail for both halves of that promise.
 */
describe("nav naming contract (RD51)", () => {
  it("labels the five tabs with their bird words and plain-meaning subtitles", () => {
    const items = navItems();
    const byHref = Object.fromEntries(items.map((item) => [item.href, item]));

    expect(byHref["/feed"]).toMatchObject({ label: "Flyway", subtitle: "the feed" });
    expect(byHref["/stories"]).toMatchObject({ label: "Perches", subtitle: "swipe sublets" });
    expect(byHref["/map"]).toMatchObject({ label: "Migration", subtitle: "your city" });
    expect(byHref["/dms"]).toMatchObject({ label: "Chirps", subtitle: "DMs" });
    expect(byHref["/profile/me"]).toMatchObject({ label: "Nest", subtitle: "you" });
  });

  it("keeps the destination hrefs frozen (labels changed, routes did not)", () => {
    const hrefs = navItems().map((item) => item.href);
    expect(hrefs).toEqual(["/feed", "/stories", "/map", "/dms", "/profile/me"]);
  });

  it("routes the Nest tab to the session user while the path shape is unchanged", () => {
    const nest = navItems("auth-user-9").find((item) => item.label === "Nest");
    expect(nest?.href).toBe("/profile/auth-user-9");
    expect(isActive(nest!, "/profile/auth-user-9")).toBe(true);
    // A different profile still marks Nest active (own vs. others share the tab).
    expect(isActive(nest!, "/profile/someone-else")).toBe(true);
  });

  it("marks Chirps active across /dms and its conversation subroutes", () => {
    const chirps = navItems().find((item) => item.label === "Chirps")!;
    expect(isActive(chirps, "/dms")).toBe(true);
    expect(isActive(chirps, "/dms/conversation-123")).toBe(true);
    expect(isActive(chirps, "/map")).toBe(false);
  });
});
