import type { MapComment } from "@/lib/types/contract";
import { notesFixture } from "./notes";
import { otherUsersFixture, meFixture } from "./users";

/**
 * Round 2 batch 2 (§12.1) — map comments = notes that carry lat/lng.
 * The client renders one placeholder per comment.
 */
export function buildMapCommentsFromNotes(): MapComment[] {
  const all = [meFixture, ...otherUsersFixture];
  return notesFixture
    .filter((n): n is typeof n & { lat: number; lng: number } =>
      typeof n.lat === "number" && typeof n.lng === "number",
    )
    .map((n) => {
      const author = all.find((u) => u.id === n.created_by);
      return {
        id: n.id,
        author: {
          id: n.created_by,
          name: author?.name ?? "an intern",
          avatarUrl: author?.avatar_url ?? null,
        },
        lat: n.lat,
        lng: n.lng,
        topic: n.topic,
        body: n.body,
        createdAt: n.created_at,
      };
    });
}

/** Live in-memory list so client "add comment" writes show up on reload. */
export const mapCommentsFixture: MapComment[] = buildMapCommentsFromNotes();
