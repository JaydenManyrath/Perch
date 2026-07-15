/**
 * Fixture|Live data-source switch.
 *
 * Set NEXT_PUBLIC_DATA_SOURCE = "fixture" | "live". Default is "fixture" so the whole
 * app is demoable with zero live keys. When "live" is chosen but a required env var is
 * missing, we degrade to the fixture — we never crash.
 *
 * Person A never holds server secrets. `live` reads only:
 *   - The frozen API routes (Person B): GET /api/feed, /api/matches, /api/itinerary,
 *     /api/map/places, POST /api/parse/offer, /api/parse/takeout, /api/composio/spotify/*
 *   - Supabase via the anon key (client) for reads of public tables + Realtime DMs.
 *
 * All shapes come from lib/types/contract.ts — frozen by the FOUNDATION-CONTRACT.
 */

import { env, hasSupabase } from "@/lib/env";
import {
  type FeedResponse,
  type MatchesResponse,
  type MapPlacesResponse,
  type ItineraryResponse,
  type OfferParse,
  type TakeoutParse,
  type SpotifyConnectResponse,
  type SpotifyStatusResponse,
  type UserRow,
  type ListingRow,
  type StickerRow,
  type EventRow,
  type NoteRow,
  type ChecklistItemRow,
  type ConversationRow,
  type MessageRow,
  type TasteProfile,
} from "@/lib/types/contract";
import * as fx from "@/lib/fixtures";

const MODE = env.dataSource;

async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── FEED (§4.1) ────────────────────────────────────────────
export async function getFeed(): Promise<FeedResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<FeedResponse>("/api/feed?limit=20");
    if (r) return r;
  }
  return fx.feedFixture;
}

// ─── MATCHES (§4.2) — connection hero ───────────────────────
export async function getMatches(): Promise<MatchesResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<MatchesResponse>("/api/matches?limit=20");
    if (r) return r;
  }
  return fx.matchesFixture;
}

// ─── MAP PLACES (§4.5) ──────────────────────────────────────
export async function getMapPlaces(): Promise<MapPlacesResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<MapPlacesResponse>("/api/map/places");
    if (r) return r;
  }
  return fx.mapPlacesFixture;
}

// ─── ITINERARY (§4.4) ───────────────────────────────────────
export async function getItinerary(days = 7): Promise<ItineraryResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<ItineraryResponse>(`/api/itinerary?days=${days}`);
    if (r) return r;
  }
  return fx.itineraryFixture;
}

// ─── ONBOARDING (§4.6) ──────────────────────────────────────
export async function parseOffer(file?: File): Promise<OfferParse> {
  if (MODE === "live" && file) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await safeFetchJson<OfferParse>("/api/parse/offer", {
      method: "POST",
      body: fd,
    });
    if (r) return r;
  }
  // Fixture: a canned parse.
  return fx.offerParseFixture;
}

export async function parseTakeout(file?: File): Promise<TakeoutParse> {
  if (MODE === "live" && file) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await safeFetchJson<TakeoutParse>("/api/parse/takeout", {
      method: "POST",
      body: fd,
    });
    if (r) return r;
  }
  return { places: fx.mapPlacesFixture.places };
}

export async function spotifyConnect(): Promise<SpotifyConnectResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<SpotifyConnectResponse>("/api/composio/spotify/connect", {
      method: "POST",
    });
    if (r) return r;
  }
  // Fixture: a fake redirect that will simulate connection completion.
  return { redirectUrl: "/onboarding?spotify=connected" };
}

export async function spotifyStatus(): Promise<SpotifyStatusResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<SpotifyStatusResponse>("/api/composio/spotify/status");
    if (r) return r;
  }
  return {
    connected: true,
    taste: fx.tasteProfileFixture,
  };
}

// ─── SUPABASE TABLES (§2) ───────────────────────────────────
// A only reads Person B's tables; writes touch owner-scoped rows (checklist toggles,
// sticker placement, message insert, conversation create-or-open). All under RLS.

export async function getMe(): Promise<UserRow> {
  return fx.meFixture;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const all = [fx.meFixture, ...fx.otherUsersFixture];
  return all.find((u) => u.id === id) ?? null;
}

export async function getListings(): Promise<ListingRow[]> {
  return fx.listingsFixture;
}

export async function getStickers(): Promise<StickerRow[]> {
  return fx.stickersFixture;
}

export async function insertSticker(input: {
  lat: number;
  lng: number;
  category: import("@/lib/types/contract").StickerCategory;
  note: string;
}): Promise<StickerRow> {
  const row: StickerRow = {
    id: `sticker-${Date.now()}`,
    lat: input.lat,
    lng: input.lng,
    category: input.category,
    note: input.note,
    created_by: fx.meFixture.id,
    created_at: new Date().toISOString(),
  };
  fx.stickersFixture.unshift(row);
  return row;
}

export async function getEvents(): Promise<EventRow[]> {
  return fx.eventsFixture;
}

export async function getNotes(): Promise<NoteRow[]> {
  return fx.notesFixture;
}

export async function getChecklist(userId: string): Promise<ChecklistItemRow[]> {
  return fx.checklistFixture.filter((c) => c.user_id === userId);
}

export async function toggleChecklistItem(id: string, done: boolean): Promise<void> {
  const it = fx.checklistFixture.find((c) => c.id === id);
  if (it) it.done = done;
}

export async function getConversationsForUser(userId: string): Promise<
  Array<ConversationRow & { peer: UserRow; lastMessage?: MessageRow }>
> {
  const rows = fx.conversationsFixture.filter((c) => c.participant_ids.includes(userId));
  return rows
    .map((c) => {
      const peerId = c.participant_ids.find((p) => p !== userId)!;
      const peer = [fx.meFixture, ...fx.otherUsersFixture].find((u) => u.id === peerId)!;
      const lastMessage = [...fx.messagesFixture]
        .filter((m) => m.conversation_id === c.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      return { ...c, peer, lastMessage };
    })
    .sort((a, b) => (b.last_message_at || "").localeCompare(a.last_message_at || ""));
}

export async function getConversationMessages(conversationId: string): Promise<MessageRow[]> {
  return [...fx.messagesFixture]
    .filter((m) => m.conversation_id === conversationId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function findOrCreateConversation(
  meId: string,
  otherId: string,
): Promise<ConversationRow> {
  const existing = fx.conversationsFixture.find((c) => {
    const p = c.participant_ids;
    return p.length === 2 && p.includes(meId) && p.includes(otherId);
  });
  if (existing) return existing;
  const row: ConversationRow = {
    id: `conv-${Date.now()}`,
    participant_ids: [meId, otherId],
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  fx.conversationsFixture.unshift(row);
  return row;
}

/**
 * Insert a message. In fixture mode we also simulate the Realtime echo so the
 * DM UI's optimistic-reconcile path exercises for demo purposes.
 */
export async function insertMessage(input: {
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
}): Promise<MessageRow> {
  const row: MessageRow = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversation_id: input.conversation_id,
    sender_id: input.sender_id,
    recipient_id: input.recipient_id,
    body: input.body,
    created_at: new Date().toISOString(),
  };
  fx.messagesFixture.push(row);
  const conv = fx.conversationsFixture.find((c) => c.id === input.conversation_id);
  if (conv) conv.last_message_at = row.created_at;
  return row;
}

/** True when live Supabase is available (env set). Consumers gate live subscription on this. */
export function isLiveSupabase(): boolean {
  return MODE === "live" && hasSupabase();
}

export function currentMode(): "fixture" | "live" {
  return MODE;
}

// Re-export tasteProfile fixture type for onboarding
export type { TasteProfile };
