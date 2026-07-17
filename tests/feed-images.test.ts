import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EventCard } from "@/components/feed/EventCard";
import { eventsFixture } from "@/lib/fixtures/events";
import { feedFixture } from "@/lib/fixtures/feed";
import type { FeedItem } from "@/lib/types/contract";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) =>
    React.createElement("img", { src, alt, className }),
}));

describe("feed event images", () => {
  it("maps fixture source image_url into the frozen FeedItem imageUrl field", () => {
    expect(feedFixture.items.length).toBeGreaterThan(0);
    expect(feedFixture.items.every((item) => item.event.imageUrl?.startsWith("https://images.unsplash.com/"))).toBe(true);
    expect(feedFixture.items.some((item) => "image_url" in item.event)).toBe(false);
  });

  it("keeps seeded feed image sources on known-usable fixture URLs", () => {
    expect(eventsFixture.filter((event) => event.image_url === null)).toEqual([]);
    expect(eventsFixture.map((event) => event.image_url)).toEqual([
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
      "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800",
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800",
      "https://images.unsplash.com/photo-1454391304352-2bf4678b1a7a?w=800",
    ]);
  });

  it("renders a source image when FeedItem.event.imageUrl is present", () => {
    const html = renderToStaticMarkup(React.createElement(EventCard, { item: feedFixture.items[0] }));

    expect(html).toContain("src=\"https://images.unsplash.com/");
    expect(html).not.toContain("No image for");
  });

  it("renders the existing placeholder when FeedItem.event.imageUrl is null", () => {
    const item: FeedItem = {
      ...feedFixture.items[0],
      event: {
        ...feedFixture.items[0].event,
        title: "No image event",
        imageUrl: null,
      },
    };

    const html = renderToStaticMarkup(React.createElement(EventCard, { item }));

    expect(html).toContain("No image for No image event");
    expect(html).not.toContain("src=\"https://images.unsplash.com/");
  });
});
