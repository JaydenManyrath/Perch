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
      "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800",
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800",
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800",
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
      "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800",
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
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
