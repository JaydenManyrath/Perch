/**
 * Fixture|Live data-source switch.
 *
 * Set NEXT_PUBLIC_DATA_SOURCE = "fixture" | "live". Default is "fixture" so the whole
 * app is demoable with zero live keys. When "live" is chosen but a required env var is
 * missing, or a route errors, we degrade to the fixture - we never crash.
 *
 * Person A never holds server secrets. `live` reads only the frozen API routes owned
 * by Person B (schema + core CRUD) and Person C (integrations + AI), plus Supabase via
 * the anon key for direct reads + realtime DMs. All shapes come from
 * lib/types/contract.ts - frozen by docs/ARCHITECTURE.md
 */

import { env, hasSupabase } from "@/lib/env";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { fetchMapboxDirections } from "@/lib/directions";
import { buildFinanceBreakdownFromOffer } from "@/lib/finance/offer";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  // Round 2 types
  type PerchDeckResponse,
  type PerchCard,
  type ListingResponse,
  type SwipeInput,
  type PostListingInput,
  type ReviewsResponse,
  type Review,
  type PostReviewInput,
  type AttendInput,
  type AttendResponse,
  type PublicProfile,
  type MapComment,
  type MapCommentsResponse,
  type PostMapCommentInput,
  type EventComment,
  type EventCommentsResponse,
  type PostEventCommentInput,
  type Friend,
  type FriendsResponse,
  type FriendRequestsResponse,
  type FriendNotesResponse,
  type GeoJSONLineString,
  type RouteResponse,
  type RoutePoi,
  type RoutePoisResponse,
  type CommuteScheduleResponse,
  type ListingStatus,
  // Round 3 types
  type ListingDetail,
  type Booking,
  type BookingsResponse,
  type BookRequestInput,
  type FinanceBreakdown,
} from "@/lib/types/contract";
import * as fx from "@/lib/fixtures";

const MODE = env.dataSource;

export type LiveDataContext = {
  supabase: SupabaseClient;
  fetch: typeof fetch;
};

type Usable<T> = (value: unknown) => value is T;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasArray<T>(key: keyof T & string): Usable<T> {
  return (value): value is T => isRecord(value) && Array.isArray(value[key]);
}

function hasString<T>(key: keyof T & string): Usable<T> {
  return (value): value is T => isRecord(value) && typeof value[key] === "string";
}

function isUserRow(value: unknown): value is UserRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.company === "string" &&
    typeof value.role === "string" &&
    typeof value.city === "string" &&
    typeof value.move_in_date === "string" &&
    typeof value.verified === "boolean" &&
    (value.avatar_url === null || typeof value.avatar_url === "string") &&
    typeof value.created_at === "string"
  );
}

function isTasteProfile(value: unknown): value is TasteProfile {
  return (
    isRecord(value) &&
    Array.isArray(value.topArtists) &&
    Array.isArray(value.topGenres) &&
    Array.isArray(value.topTracks)
  );
}

/**
 * Normalize a live `users` row into the frozen UserRow shape. Rows minted from an
 * offer letter (POST /api/onboarding/account) legitimately carry NULL company/role/
 * city/move_in_date when the letter lacked a field; the strict isUserRow guard would
 * reject those rows and silently bounce the signed-in user back to the seeded
 * persona. Identity stays strict (id + name must be strings); every optional field
 * coalesces to the contract's empty value instead.
 */
function toUserRow(value: unknown): UserRow | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string") return null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id: value.id,
    name: value.name,
    company: str(value.company),
    role: str(value.role),
    city: str(value.city),
    move_in_date: str(value.move_in_date),
    taste_profile: isTasteProfile(value.taste_profile) ? value.taste_profile : null,
    verified: value.verified === true,
    avatar_url: typeof value.avatar_url === "string" ? value.avatar_url : null,
    created_at: str(value.created_at),
    user_type:
      value.user_type === "intern" || value.user_type === "subletter"
        ? value.user_type
        : undefined,
  };
}

function isListingRow(value: unknown): value is ListingRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.address === "string" &&
    typeof value.lat === "number" &&
    typeof value.lng === "number" &&
    typeof value.price === "number" &&
    Array.isArray(value.photos)
  );
}

function isStickerRow(value: unknown): value is StickerRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.lat === "number" &&
    typeof value.lng === "number" &&
    typeof value.category === "string" &&
    typeof value.note === "string" &&
    typeof value.created_by === "string"
  );
}

function isEventRow(value: unknown): value is EventRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.category === "string" &&
    typeof value.lat === "number" &&
    typeof value.lng === "number" &&
    typeof value.datetime === "string"
  );
}

function isNoteRow(value: unknown): value is NoteRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.city === null || typeof value.city === "string") &&
    typeof value.topic === "string" &&
    typeof value.body === "string" &&
    typeof value.created_by === "string"
  );
}

function isChecklistItemRow(value: unknown): value is ChecklistItemRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.user_id === "string" &&
    typeof value.label === "string" &&
    typeof value.due_offset === "number" &&
    typeof value.done === "boolean"
  );
}

function isConversationRow(value: unknown): value is ConversationRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    Array.isArray(value.participant_ids) &&
    value.participant_ids.every((id) => typeof id === "string") &&
    typeof value.last_message_at === "string" &&
    typeof value.created_at === "string"
  );
}

function isMessageRow(value: unknown): value is MessageRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.conversation_id === "string" &&
    typeof value.sender_id === "string" &&
    typeof value.recipient_id === "string" &&
    typeof value.body === "string" &&
    typeof value.created_at === "string"
  );
}

function hasId(value: unknown): value is Record<string, unknown> & { id: string } {
  return isRecord(value) && typeof value.id === "string";
}

function isBooking(value: unknown): value is Booking {
  return (
    hasId(value) &&
    typeof value.listingId === "string" &&
    isRecord(value.booker) &&
    Array.isArray(value.pendingRoommates) &&
    Array.isArray(value.roommates) &&
    typeof value.status === "string"
  );
}

function isFinanceBreakdown(value: unknown): value is FinanceBreakdown {
  return (
    isRecord(value) &&
    typeof value.takeHome === "number" &&
    typeof value.monthlyTakeHome === "number" &&
    typeof value.monthlyBudget === "number" &&
    typeof value.city === "string"
  );
}

function isRouteResponse(value: unknown): value is RouteResponse {
  return (
    isRecord(value) &&
    isRecord(value.geometry) &&
    value.geometry.type === "LineString" &&
    Array.isArray(value.geometry.coordinates) &&
    typeof value.distanceMeters === "number" &&
    typeof value.durationSeconds === "number"
  );
}

function canUseLiveData(): boolean {
  return MODE === "live" && hasSupabase();
}

function liveSupabase(context?: LiveDataContext): SupabaseClient | null {
  if (!canUseLiveData()) return null;
  return context?.supabase ?? getSupabaseBrowser();
}

async function authenticatedUserId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error ? null : (user?.id ?? null);
}

async function safeFetchJson<T>(
  url: string,
  init?: RequestInit,
  usable?: Usable<T>,
  context?: LiveDataContext,
): Promise<T | null> {
  try {
    const res = await (context?.fetch ?? fetch)(url, init);
    if (!res.ok) return null;
    const value: unknown = await res.json();
    if (usable && !usable(value)) return null;
    return value as T;
  } catch {
    return null;
  }
}

// FEED (section 4.1)
export async function getFeed(context?: LiveDataContext): Promise<FeedResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<FeedResponse>(
      "/api/feed?limit=20",
      undefined,
      hasArray<FeedResponse>("items"),
      context,
    );
    if (r) return r;
  }
  return fx.feedFixture;
}

// MATCHES (section 4.2) - connection hero
export async function getMatches(context?: LiveDataContext): Promise<MatchesResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<MatchesResponse>(
      "/api/matches?limit=20",
      undefined,
      hasArray<MatchesResponse>("matches"),
      context,
    );
    if (r) return r;
  }
  return fx.matchesFixture;
}

// MAP PLACES (section 4.5)
export async function getMapPlaces(context?: LiveDataContext): Promise<MapPlacesResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<MapPlacesResponse>(
      "/api/map/places",
      undefined,
      hasArray<MapPlacesResponse>("places"),
      context,
    );
    if (r) return r;
  }
  return fx.mapPlacesFixture;
}

// ITINERARY (section 4.4)
export async function getItinerary(days = 7, context?: LiveDataContext): Promise<ItineraryResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<ItineraryResponse>(
      `/api/itinerary?days=${days}`,
      undefined,
      (value): value is ItineraryResponse =>
        isRecord(value) &&
        Array.isArray(value.landingWeek) &&
        typeof value.calendarSynced === "boolean",
      context,
    );
    if (r) return r;
  }
  return fx.itineraryFixture;
}

// ONBOARDING (section 4.6)
export async function parseOffer(file?: File): Promise<OfferParse> {
  if (canUseLiveData() && file) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await safeFetchJson<OfferParse>(
      "/api/parse/offer",
      { method: "POST", body: fd },
      (value): value is OfferParse =>
        isRecord(value) &&
        typeof value.employer === "string" &&
        isRecord(value.confidence) &&
        Array.isArray(value.needsReview),
    );
    if (r) return r;
  }
  return fx.offerParseFixture;
}

export async function parseTakeout(file?: File): Promise<TakeoutParse> {
  if (canUseLiveData() && file) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await safeFetchJson<TakeoutParse>(
      "/api/parse/takeout",
      { method: "POST", body: fd },
      hasArray<TakeoutParse>("places"),
    );
    if (r) return r;
  }
  return { places: fx.mapPlacesFixture.places };
}

export async function spotifyConnect(): Promise<SpotifyConnectResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<SpotifyConnectResponse>(
      "/api/composio/spotify/connect",
      { method: "POST" },
      hasString<SpotifyConnectResponse>("redirectUrl"),
    );
    if (r) return r;
  }
  return { redirectUrl: "/onboarding?spotify=connected" };
}

export async function spotifyStatus(): Promise<SpotifyStatusResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<SpotifyStatusResponse>(
      "/api/composio/spotify/status",
      undefined,
      (value): value is SpotifyStatusResponse =>
        isRecord(value) && typeof value.connected === "boolean" && "taste" in value,
    );
    if (r) return r;
  }
  return {
    connected: true,
    taste: fx.tasteProfileFixture,
  };
}

// SUPABASE TABLES (section 2)
const USER_SELECT =
  "id,name,company,role,city,move_in_date,taste_profile,verified,avatar_url,created_at,user_type";
const LISTING_SELECT =
  "id,title,address,lat,lng,price,lease_start,lease_end,lease_type,source,photos,safety_flags,created_by,created_at,status,expires_at,last_confirmed_at,sourced,source_name,source_url,external_id";

/**
 * The current user. Live: browser session (or the server context's session-bound
 * client) -> auth.getUser() -> select own `users` row, normalized via toUserRow so a
 * minted account with sparse offer fields still resolves to THEIR identity. Any
 * error, missing session, or unusable row falls back to the seeded persona; fixture
 * mode always returns the seeded persona.
 */
export async function getMe(context?: LiveDataContext): Promise<UserRow> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const userId = await authenticatedUserId(supabase);
      if (userId) {
        const { data, error } = await supabase
          .from("users")
          .select(USER_SELECT)
          .eq("id", userId)
          .maybeSingle();
        if (!error) {
          const row = toUserRow(data);
          if (row) return row;
        }
      }
    } catch {
      // Fall through to the complete fixture experience.
    }
  }
  return fx.meFixture;
}

export async function getUserById(id: string, context?: LiveDataContext): Promise<UserRow | null> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(USER_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (!error) {
        if (data === null) return null;
        // Same normalization as getMe: minted rows may have NULL optional fields.
        const row = toUserRow(data);
        if (row) return row;
      }
    } catch {
      // Fall through to fixture data.
    }
  }
  const all = [fx.meFixture, ...fx.otherUsersFixture, ...fx.sublettersFixture];
  return all.find((u) => u.id === id) ?? null;
}

export async function getListings(context?: LiveDataContext): Promise<ListingRow[]> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_SELECT)
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data) && data.every(isListingRow)) return data;
    } catch {
      // Fall through to fixture data.
    }
  }
  return fx.listingsFixture;
}

export async function getStickers(context?: LiveDataContext): Promise<StickerRow[]> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("stickers")
        .select("id,lat,lng,category,note,created_by,created_at")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data) && data.every(isStickerRow)) return data;
    } catch {
      // Fall through to fixture data.
    }
  }
  return fx.stickersFixture;
}

export async function insertSticker(input: {
  lat: number;
  lng: number;
  category: import("@/lib/types/contract").StickerCategory;
  note: string;
}, context?: LiveDataContext): Promise<StickerRow> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const userId = await authenticatedUserId(supabase);
      if (userId) {
        const { data, error } = await supabase
          .from("stickers")
          .insert({ ...input, created_by: userId })
          .select("id,lat,lng,category,note,created_by,created_at")
          .single();
        if (!error && isStickerRow(data)) return data;
      }
    } catch {
      // Fall through to the fixture mutation.
    }
  }
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

export async function getEvents(context?: LiveDataContext): Promise<EventRow[]> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,category,lat,lng,datetime,source,venue,url,image_url,price_range")
        .gte("datetime", new Date().toISOString())
        .order("datetime", { ascending: true });
      if (!error && Array.isArray(data) && data.every(isEventRow)) return data;
    } catch {
      // Fall through to fixture data.
    }
  }
  return fx.eventsFixture;
}

export async function getNotes(context?: LiveDataContext): Promise<NoteRow[]> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("id,city,area,topic,body,created_by,created_at,lat,lng")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data) && data.every(isNoteRow)) return data;
    } catch {
      // Fall through to fixture data.
    }
  }
  return fx.notesFixture;
}

export async function getChecklist(
  userId: string,
  context?: LiveDataContext,
): Promise<ChecklistItemRow[]> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const callerId = await authenticatedUserId(supabase);
      if (callerId) {
        const { data, error } = await supabase
          .from("checklist_items")
          .select("id,user_id,label,due_offset,done,category")
          .eq("user_id", callerId)
          .order("due_offset", { ascending: false });
        if (!error && Array.isArray(data) && data.every(isChecklistItemRow)) return data;
      }
    } catch {
      // Fall through to fixture data.
    }
  }
  const fixtureUserId = canUseLiveData() ? fx.meFixture.id : userId;
  return fx.checklistFixture.filter((c) => c.user_id === fixtureUserId);
}

export async function toggleChecklistItem(
  id: string,
  done: boolean,
  context?: LiveDataContext,
): Promise<void> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const { error } = await supabase.from("checklist_items").update({ done }).eq("id", id);
      if (!error) return;
    } catch {
      // Fall through to the fixture mutation.
    }
  }
  const it = fx.checklistFixture.find((c) => c.id === id);
  if (it) it.done = done;
}

export async function getConversationsForUser(
  userId: string,
  context?: LiveDataContext,
): Promise<Array<ConversationRow & { peer: UserRow; lastMessage?: MessageRow }>> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const callerId = await authenticatedUserId(supabase);
      if (callerId) {
        const { data: conversations, error: conversationError } = await supabase
          .from("conversations")
          .select("id,participant_ids,last_message_at,created_at")
          .contains("participant_ids", [callerId])
          .order("last_message_at", { ascending: false });
        if (conversationError || !Array.isArray(conversations) || !conversations.every(isConversationRow)) {
          throw conversationError ?? new Error("unusable_conversations");
        }

        const peerIds = conversations.flatMap((conversation) =>
          conversation.participant_ids.filter((id) => id !== callerId),
        );
        const conversationIds = conversations.map((conversation) => conversation.id);
        const [{ data: peers, error: peerError }, { data: messages, error: messageError }] =
          await Promise.all([
            peerIds.length
              ? supabase.from("users").select(USER_SELECT).in("id", peerIds)
              : Promise.resolve({ data: [], error: null }),
            conversationIds.length
              ? supabase
                  .from("messages")
                  .select("id,conversation_id,sender_id,recipient_id,body,created_at")
                  .in("conversation_id", conversationIds)
                  .order("created_at", { ascending: false })
              : Promise.resolve({ data: [], error: null }),
          ]);
        if (
          peerError ||
          messageError ||
          !Array.isArray(peers) ||
          !peers.every(isUserRow) ||
          !Array.isArray(messages) ||
          !messages.every(isMessageRow)
        ) {
          throw peerError ?? messageError ?? new Error("unusable_conversation_relations");
        }

        const peerById = new Map(peers.map((peer) => [peer.id, peer]));
        const lastByConversation = new Map<string, MessageRow>();
        for (const message of messages) {
          if (!lastByConversation.has(message.conversation_id)) {
            lastByConversation.set(message.conversation_id, message);
          }
        }
        return conversations.flatMap((conversation) => {
          const peerId = conversation.participant_ids.find((id) => id !== callerId);
          const peer = peerId ? peerById.get(peerId) : undefined;
          return peer
            ? [{ ...conversation, peer, lastMessage: lastByConversation.get(conversation.id) }]
            : [];
        });
      }
    } catch {
      // Fall through to the complete fixture conversation list.
    }
  }
  // Include subletters in the lookup so messaging a host from a subletter
  // profile doesn't leave the DM list with peer=undefined.
  const fixtureUserId = canUseLiveData() ? fx.meFixture.id : userId;
  const allUsers = [fx.meFixture, ...fx.otherUsersFixture, ...fx.sublettersFixture];
  const rows = fx.conversationsFixture.filter((c) => c.participant_ids.includes(fixtureUserId));
  return rows
    .map((c) => {
      const peerId = c.participant_ids.find((p) => p !== fixtureUserId);
      const peer = peerId ? allUsers.find((u) => u.id === peerId) : undefined;
      const lastMessage = [...fx.messagesFixture]
        .filter((m) => m.conversation_id === c.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] as MessageRow | undefined;
      return { ...c, peer, lastMessage };
    })
    // Drop conversations where the peer can't be resolved (safety net; shouldn't
    // happen now that we search all user pools).
    .flatMap((r) =>
      r.peer
        ? [
            {
              ...r,
              peer: r.peer,
              lastMessage: r.lastMessage,
            } as ConversationRow & { peer: UserRow; lastMessage?: MessageRow },
          ]
        : [],
    )
    .sort((a, b) => (b.last_message_at || "").localeCompare(a.last_message_at || ""));
}

export async function getConversationMessages(
  conversationId: string,
  context?: LiveDataContext,
): Promise<MessageRow[]> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,recipient_id,body,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data) && data.every(isMessageRow)) return data;
    } catch {
      // Fall through to fixture messages.
    }
  }
  return [...fx.messagesFixture]
    .filter((m) => m.conversation_id === conversationId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Deterministic conversation id for a 2-person pair. Sorting the ids makes
 * it symmetric: (me, other) and (other, me) map to the same string. This lets
 * client-side createOrOpen and server-side lookup agree WITHOUT sharing memory.
 * Old seeded conversations keep their legacy ids (conv-jordan etc.); the
 * participant-set lookup below picks them up first so they aren't duplicated.
 */
export function conversationIdFor(a: string, b: string): string {
  const [x, y] = [a, b].slice().sort();
  return `conv-${x}__${y}`;
}

export async function findOrCreateConversation(
  meId: string,
  otherId: string,
  context?: LiveDataContext,
): Promise<ConversationRow> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const callerId = await authenticatedUserId(supabase);
      if (callerId && callerId !== otherId) {
        const { data: found, error: findError } = await supabase
          .from("conversations")
          .select("id,participant_ids,last_message_at,created_at")
          .contains("participant_ids", [callerId, otherId])
          .limit(1)
          .maybeSingle();
        if (findError) throw findError;
        if (found && isConversationRow(found)) return found;

        const now = new Date().toISOString();
        const { data: created, error: createError } = await supabase
          .from("conversations")
          .insert({
            participant_ids: [callerId, otherId],
            last_message_at: now,
            created_at: now,
          })
          .select("id,participant_ids,last_message_at,created_at")
          .single();
        if (!createError && isConversationRow(created)) return created;
      }
    } catch {
      // Fall through to fixture behavior.
    }
  }
  // Reuse an existing conv (legacy seed or previously created).
  const existing = fx.conversationsFixture.find((c) => {
    const p = c.participant_ids;
    return p.length === 2 && p.includes(meId) && p.includes(otherId);
  });
  if (existing) return existing;
  const row: ConversationRow = {
    id: conversationIdFor(meId, otherId),
    participant_ids: [meId, otherId],
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  fx.conversationsFixture.unshift(row);
  return row;
}

/** Parse the two user ids out of a deterministic conversation id. Null if
 * it's not one of ours (e.g. a legacy id like 'conv-jordan'). */
export function participantsFromConversationId(id: string): [string, string] | null {
  if (!id.startsWith("conv-")) return null;
  const body = id.slice("conv-".length);
  const parts = body.split("__");
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!a || !b) return null;
  return [a, b];
}

export async function insertMessage(input: {
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
}, context?: LiveDataContext): Promise<MessageRow> {
  const supabase = liveSupabase(context);
  if (supabase) {
    try {
      const callerId = await authenticatedUserId(supabase);
      if (callerId) {
        const { data, error } = await supabase
          .from("messages")
          .insert({
            conversation_id: input.conversation_id,
            sender_id: callerId,
            recipient_id: input.recipient_id,
            body: input.body,
          })
          .select("id,conversation_id,sender_id,recipient_id,body,created_at")
          .single();
        if (!error && isMessageRow(data)) {
          await supabase
            .from("conversations")
            .update({ last_message_at: data.created_at })
            .eq("id", input.conversation_id);
          return data;
        }
      }
    } catch {
      // Fall through to fixture behavior.
    }
  }
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

export function isLiveSupabase(): boolean {
  return canUseLiveData();
}

export function currentMode(): "fixture" | "live" {
  return canUseLiveData() ? "live" : "fixture";
}

/**
 * Reviewable inventory for RA43. The accompanying test requires every exported
 * get* function to declare its live seam here, so new getters cannot silently
 * become fixture-only.
 */
export const DATA_SOURCE_GETTER_AUDIT = {
  getFeed: "route:/api/feed",
  getMatches: "route:/api/matches",
  getMapPlaces: "route:/api/map/places",
  getItinerary: "route:/api/itinerary",
  getMe: "supabase:users+session",
  getUserById: "supabase:users",
  getListings: "supabase:listings",
  getStickers: "supabase:stickers",
  getEvents: "supabase:events",
  getNotes: "supabase:notes",
  getChecklist: "supabase:checklist_items+session",
  getConversationsForUser: "supabase:conversations+messages+users+session",
  getConversationMessages: "supabase:messages",
  getPerchDeck: "route:/api/perches",
  getSavedPerches: "route:/api/perches/saved",
  getReviews: "route:/api/reviews",
  getEventComments: "route:/api/events/[id]/comments",
  getPublicProfile: "route:/api/users/[id]",
  getMapComments: "route:/api/map/comments",
  getFriends: "route:/api/friends",
  getFriendRequests: "route:/api/friends/requests",
  getFriendNotes: "route:/api/friends/notes",
  getRoutePois: "route:/api/route/pois",
  getListingDetail: "route:/api/listings/[id]",
  getBookings: "route:/api/bookings+session",
  getFinance: "route:/api/finance+session",
  getFinanceForOffer: "route:/api/finance+session",
} as const;

export type { TasteProfile };

// ROUND 2 - Perches swipe deck + saved tray (section 11.3)

/** Client-side swipe memory. In fixture mode this is the source of truth. */
const swipedRight = new Set<string>(fx.savedPerchesFixture.map((p) => p.id));
const swipedLeft = new Set<string>();

export async function getPerchDeck(context?: LiveDataContext): Promise<PerchDeckResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<PerchDeckResponse>(
      "/api/perches",
      undefined,
      hasArray<PerchDeckResponse>("deck"),
      context,
    );
    if (r) return r;
  }
  // Rebuild the deck on every call so a listing that just went to status='taken'
  // (via a confirmed booking, RA34) drops out immediately - the pre-computed
  // fixture only sees the initial state.
  const freshCards = fx.listingsFixture
    .filter((l) => (l.status ?? "available") === "available")
    .map((l) => fx.buildPerchCard(l));
  return {
    deck: freshCards.filter((c) => !swipedRight.has(c.id) && !swipedLeft.has(c.id)),
  };
}

export async function recordSwipe(input: SwipeInput): Promise<void> {
  if (canUseLiveData()) {
    await safeFetchJson("/api/perches/swipe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  }
  if (input.direction === "right") {
    swipedRight.add(input.listingId);
    swipedLeft.delete(input.listingId);
    if (!fx.savedPerchesFixture.some((p) => p.id === input.listingId)) {
      const card = fx.perchDeckFixture.deck.find((c) => c.id === input.listingId);
      if (card) fx.savedPerchesFixture.unshift(card);
    }
  } else {
    swipedLeft.add(input.listingId);
    swipedRight.delete(input.listingId);
    const i = fx.savedPerchesFixture.findIndex((p) => p.id === input.listingId);
    if (i >= 0) fx.savedPerchesFixture.splice(i, 1);
  }
}

export async function getSavedPerches(context?: LiveDataContext): Promise<PerchCard[]> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<{ saved: PerchCard[] } | { deck: PerchCard[] } | PerchCard[]>(
      "/api/perches/saved",
      undefined,
      (value): value is { saved: PerchCard[] } | { deck: PerchCard[] } | PerchCard[] =>
        Array.isArray(value) ||
        (isRecord(value) && (Array.isArray(value.saved) || Array.isArray(value.deck))),
      context,
    );
    if (r) return Array.isArray(r) ? r : "saved" in r ? r.saved : r.deck;
  }
  return fx.savedPerchesFixture.slice();
}

// ROUND 2 - Subletter posting + freshness (section 11.4, 11.2)
export async function postListing(input: PostListingInput): Promise<ListingRow> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<ListingResponse>(
      "/api/listings",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      (value): value is ListingResponse =>
        isRecord(value) && isRecord(value.listing) && isListingRow(value.listing),
    );
    if (r) {
      const card = r.listing;
      return {
        id: card.id,
        title: card.title,
        address: card.address,
        lat: card.lat,
        lng: card.lng,
        price: card.price,
        lease_start: card.lease_start,
        lease_end: card.lease_end,
        lease_type: card.lease_type,
        source: card.sourceName,
        photos: card.photos,
        safety_flags: card.safety_flags,
        created_by: card.host?.id ?? null,
        created_at: card.created_at,
        status: card.status,
        expires_at: card.expiresAt,
        last_confirmed_at: card.lastConfirmedAt,
        sourced: card.sourced,
        source_name: card.sourceName,
        source_url: null,
        external_id: null,
      };
    }
  }
  const row: ListingRow = {
    id: `L-new-${Date.now()}`,
    title: input.title,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    price: input.price,
    lease_start: input.leaseStart,
    lease_end: input.leaseEnd,
    lease_type: input.leaseType,
    source: "subletter",
    photos: input.photos,
    safety_flags: { scamSignals: [], notes: input.safetyNotes ?? [] },
    created_by: fx.meFixture.id,
    created_at: new Date().toISOString(),
    status: "available",
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    last_confirmed_at: new Date().toISOString(),
    sourced: false,
    source_name: "subletter",
    source_url: null,
    external_id: null,
  };
  fx.listingsFixture.unshift(row);
  return row;
}

export async function confirmListing(id: string): Promise<{ status: ListingStatus }> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<{ status: ListingStatus }>(
      `/api/listings/${id}/confirm`,
      { method: "POST" },
      hasString<{ status: ListingStatus }>("status"),
    );
    if (r) return r;
  }
  const l = fx.listingsFixture.find((x) => x.id === id);
  if (l) {
    l.status = "available";
    l.last_confirmed_at = new Date().toISOString();
    l.expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  }
  return { status: "available" };
}

// ROUND 2 - Reviews (section 11.5)
export async function getReviews(subjectType: "listing" | "subletter", subjectId: string): Promise<ReviewsResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<ReviewsResponse>(
      `/api/reviews?subjectType=${encodeURIComponent(subjectType)}&subjectId=${encodeURIComponent(subjectId)}`,
      undefined,
      (value): value is ReviewsResponse =>
        isRecord(value) && Array.isArray(value.reviews) && isRecord(value.summary),
    );
    if (r) return r;
  }
  const rows = fx.reviewsFixture.filter(
    (r) => r.subjectType === subjectType && r.subjectId === subjectId,
  );
  const count = rows.length;
  const avgRating = count === 0 ? 0 : rows.reduce((a, r) => a + r.rating, 0) / count;
  return { reviews: rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)), summary: { avgRating, count } };
}

export async function postReview(input: PostReviewInput): Promise<Review> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<Review>(
      "/api/reviews",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      (value): value is Review => hasId(value) && typeof value.rating === "number",
    );
    if (r) return r;
  }
  const me = fx.meFixture;
  const existing = fx.reviewsFixture.find(
    (r) =>
      r.subjectType === input.subjectType &&
      r.subjectId === input.subjectId &&
      r.reviewer.id === me.id,
  );
  if (existing) {
    existing.rating = input.rating;
    existing.body = input.body;
    existing.createdAt = new Date().toISOString();
    return existing;
  }
  const row: Review = {
    id: `R-${Date.now()}`,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    reviewer: { id: me.id, name: me.name, avatarUrl: me.avatar_url },
    rating: input.rating,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  fx.reviewsFixture.unshift(row);
  return row;
}

// ROUND 2 - Event attendance (section 11.6, 12.2) + comments (12.2)
/** Client-side attendance memory in fixture mode. */
const attendance = new Map<string, boolean>();

export async function attendEvent(eventId: string, input: AttendInput): Promise<AttendResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<AttendResponse>(
      `/api/events/${eventId}/attend`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      (value): value is AttendResponse =>
        isRecord(value) && typeof value.going === "number" && typeof value.viewerGoing === "boolean",
    );
    if (r) return r;
  }
  const item = fx.feedFixture.items.find((it) => it.event.id === eventId);
  const prev = attendance.get(eventId) ?? item?.viewerGoing ?? false;
  attendance.set(eventId, input.going);
  const baseCount = item?.internsGoing ?? 0;
  const delta = (input.going ? 1 : 0) - (prev ? 1 : 0);
  const newCount = Math.max(0, baseCount + delta);
  if (item) {
    item.internsGoing = newCount;
    item.viewerGoing = input.going;
  }
  return { going: newCount, viewerGoing: input.going };
}

export async function getEventComments(eventId: string): Promise<EventCommentsResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<EventCommentsResponse>(
      `/api/events/${eventId}/comments`,
      undefined,
      hasArray<EventCommentsResponse>("comments"),
    );
    if (r) return r;
  }
  const comments = fx.eventCommentsFixture
    .filter((c) => c.eventId === eventId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { comments };
}

export async function postEventComment(eventId: string, input: PostEventCommentInput): Promise<EventComment> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<EventComment>(
      `/api/events/${eventId}/comments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      (value): value is EventComment => hasId(value) && typeof value.eventId === "string",
    );
    if (r) return r;
  }
  const me = fx.meFixture;
  const row: EventComment = {
    id: `EC-${Date.now()}`,
    eventId,
    author: { id: me.id, name: me.name, avatarUrl: me.avatar_url },
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  fx.eventCommentsFixture.push(row);
  return row;
}

// ROUND 2 - Public profile (section 11.8)
export async function getPublicProfile(
  id: string,
  context?: LiveDataContext,
): Promise<PublicProfile | null> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<PublicProfile>(
      `/api/users/${id}`,
      undefined,
      (value): value is PublicProfile =>
        isRecord(value) && isRecord(value.user) && typeof value.user.id === "string",
      context,
    );
    if (r) return r;
  }
  return fx.publicProfileFor(id);
}

// ROUND 2 batch 2 - Map comments (section 12.1)
export async function getMapComments(bbox?: {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}, context?: LiveDataContext): Promise<MapCommentsResponse> {
  if (canUseLiveData()) {
    const q = bbox
      ? `?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`
      : "";
    const r = await safeFetchJson<MapCommentsResponse>(
      `/api/map/comments${q}`,
      undefined,
      hasArray<MapCommentsResponse>("comments"),
      context,
    );
    if (r) return r;
  }
  const all = fx.mapCommentsFixture.slice();
  const comments = bbox
    ? all.filter(
        (c) =>
          c.lat >= bbox.minLat &&
          c.lat <= bbox.maxLat &&
          c.lng >= bbox.minLng &&
          c.lng <= bbox.maxLng,
      )
    : all;
  return { comments };
}

export async function addMapComment(input: PostMapCommentInput): Promise<MapComment> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<MapComment>(
      "/api/map/comments",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      (value): value is MapComment => hasId(value) && typeof value.body === "string",
    );
    if (r) return r;
  }
  const me = fx.meFixture;
  const row: MapComment = {
    id: `MC-${Date.now()}`,
    author: { id: me.id, name: me.name, avatarUrl: me.avatar_url },
    lat: input.lat,
    lng: input.lng,
    topic: input.topic,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  fx.mapCommentsFixture.unshift(row);
  return row;
}

// ROUND 2 batch 2 - Friends + notes (section 12.3, 12.4)
export async function getFriends(context?: LiveDataContext): Promise<FriendsResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<FriendsResponse>(
      "/api/friends",
      undefined,
      hasArray<FriendsResponse>("friends"),
      context,
    );
    if (r) return r;
  }
  return { friends: fx.friendsFixture.slice() };
}

export async function getFriendRequests(context?: LiveDataContext): Promise<FriendRequestsResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<FriendRequestsResponse | FriendsResponse>(
      "/api/friends/requests",
      undefined,
      (value): value is FriendRequestsResponse | FriendsResponse =>
        isRecord(value) && (Array.isArray(value.requests) || Array.isArray(value.friends)),
      context,
    );
    if (r) return "requests" in r ? r : { requests: r.friends };
  }
  return { requests: fx.friendRequestsFixture.slice() };
}

export async function requestFriend(userId: string): Promise<Friend | null> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<Friend>(
      "/api/friends/request",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      },
      (value): value is Friend =>
        isRecord(value) && isRecord(value.user) && typeof value.user.id === "string",
    );
    if (r) return r;
  }
  if (fx.friendsFixture.some((f) => f.user.id === userId)) return null;
  if (fx.friendRequestsFixture.some((f) => f.user.id === userId)) return null;
  const target = fx.otherUsersFixture.find((u) => u.id === userId);
  if (!target) return null;
  const outgoing: Friend = {
    user: {
      id: target.id,
      name: target.name,
      avatarUrl: target.avatar_url,
      company: target.company,
    },
    status: "pending",
    direction: "outgoing",
  };
  fx.friendRequestsFixture.push(outgoing);
  return outgoing;
}

export async function acceptFriend(userId: string): Promise<Friend | null> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<Friend>(
      `/api/friends/${userId}/accept`,
      { method: "POST" },
      (value): value is Friend =>
        isRecord(value) && isRecord(value.user) && typeof value.user.id === "string",
    );
    if (r) return r;
  }
  const idx = fx.friendRequestsFixture.findIndex(
    (f) => f.user.id === userId && f.direction === "incoming",
  );
  if (idx < 0) return null;
  const accepted: Friend = { ...fx.friendRequestsFixture[idx], status: "accepted", direction: undefined };
  fx.friendRequestsFixture.splice(idx, 1);
  fx.friendsFixture.push(accepted);
  return accepted;
}

export async function declineFriend(userId: string): Promise<void> {
  if (canUseLiveData()) {
    await safeFetchJson(`/api/friends/${userId}/decline`, { method: "POST" });
  }
  const idx = fx.friendRequestsFixture.findIndex(
    (f) => f.user.id === userId && f.direction === "incoming",
  );
  if (idx >= 0) fx.friendRequestsFixture.splice(idx, 1);
}

export async function getFriendNotes(): Promise<FriendNotesResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<FriendNotesResponse>(
      "/api/friends/notes",
      undefined,
      hasArray<FriendNotesResponse>("notes"),
    );
    if (r) return r;
  }
  return { notes: fx.friendNotesFixture.slice() };
}

// ROUND 2 batch 2 - Commute route + POIs + schedule (section 12.6)
export async function planRoute(input: {
  officeLat: number;
  officeLng: number;
  apartmentLat: number;
  apartmentLng: number;
}): Promise<RouteResponse> {
  // 1. Live route (Person C's RC6, when it ships).
  if (canUseLiveData()) {
    const r = await safeFetchJson<RouteResponse>(
      "/api/route",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      isRouteResponse,
    );
    if (r) return r;
  }
  // 2. Client-side Mapbox Directions - real road-following (Google-Maps-like).
  const mbox = await fetchMapboxDirections(
    { lat: input.officeLat, lng: input.officeLng },
    { lat: input.apartmentLat, lng: input.apartmentLng },
    "walking",
  );
  if (mbox) return mbox;
  // 3. Fallback: Haversine straight-line so the UI never breaks.
  return fx.buildFixtureRoute(input);
}

export async function getRoutePois(input: {
  geometry: GeoJSONLineString;
  kinds: string[];
}): Promise<RoutePoisResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<RoutePoisResponse>(
      "/api/route/pois",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      hasArray<RoutePoisResponse>("pois"),
    );
    if (r) return r;
  }
  const pois: RoutePoi[] = fx.findPoisAlongRoute(input.geometry, input.kinds);
  return { pois };
}

export async function buildCommuteSchedule(input: {
  apartmentId: string;
  selectedPlaceIds: string[];
}): Promise<CommuteScheduleResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<CommuteScheduleResponse>(
      "/api/route/schedule",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      (value): value is CommuteScheduleResponse => isRecord(value) && isRecord(value.day),
    );
    if (r) return r;
  }
  return fx.buildScheduleFromSelections(input);
}

// Round 3 - Comprehensive listing detail (section 13.2)
export async function getListingDetail(
  id: string,
  context?: LiveDataContext,
): Promise<ListingDetail | null> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<ListingDetail>(
      `/api/listings/${id}`,
      undefined,
      (value): value is ListingDetail =>
        hasId(value) && typeof value.title === "string" && Array.isArray(value.photos),
      context,
    );
    if (r) return r;
  }
  return fx.listingDetailFor(id);
}

// Round 3 - Booking flow (section 13.4)
export async function getBookings(userId: string): Promise<BookingsResponse> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<BookingsResponse>(
      "/api/bookings",
      undefined,
      (value): value is BookingsResponse =>
        isRecord(value) && Array.isArray(value.mine) && Array.isArray(value.incoming),
    );
    if (r) return r;
  }
  // Fixture: find my bookings + bookings against my listings. A failed live
  // read deliberately restores the established demo identity and data.
  const fixtureUserId = canUseLiveData() ? fx.meFixture.id : userId;
  const all = fx.bookingsFixture;
  const myListingIds = new Set(
    fx.listingsFixture.filter((l) => l.created_by === fixtureUserId).map((l) => l.id),
  );
  const mine = all
    .filter(
      (b) =>
        b.booker.id === fixtureUserId ||
        b.pendingRoommates.some((r) => r.id === fixtureUserId) ||
        b.roommates.some((r) => r.id === fixtureUserId),
    )
    .map((b) => ({
      ...b,
      viewerRole:
        b.booker.id === fixtureUserId
          ? ("booker" as const)
          : b.roommates.some((r) => r.id === fixtureUserId)
            ? ("roommate" as const)
            : b.pendingRoommates.some((r) => r.id === fixtureUserId)
              ? ("invitee" as const)
              : ("other" as const),
    }));
  const incoming = all.filter((b) => myListingIds.has(b.listingId)).map((b) => ({ ...b, viewerRole: "owner" as const }));
  return { mine, incoming };
}

export async function requestBooking(
  listingId: string,
  input: BookRequestInput,
): Promise<Booking> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<Booking>(
      `/api/listings/${listingId}/book`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      isBooking,
    );
    if (r) return r;
  }
  const me = fx.meFixture;
  const acceptedFriendIds = new Set(fx.friendsFixture.filter((f) => f.status === "accepted").map((f) => f.user.id));
  const pendingRoommates = (input.roommateIds ?? [])
    .filter((id) => id !== me.id && acceptedFriendIds.has(id))
    .map((id) => {
      const u = [me, ...fx.otherUsersFixture].find((x) => x.id === id);
      return u ? { id: u.id, name: u.name, avatarUrl: u.avatar_url } : null;
    })
    .filter((r): r is { id: string; name: string; avatarUrl: string | null } => !!r);
  const row: Booking = {
    id: `book-${me.id}-${listingId}-${Date.now()}`,
    listingId,
    booker: { id: me.id, name: me.name, avatarUrl: me.avatar_url },
    pendingRoommates,
    roommates: [],
    status: "requested",
    createdAt: new Date().toISOString(),
    decidedAt: null,
    viewerRole: "booker",
  };
  fx.bookingsFixture.unshift(row);
  return row;
}

export async function approveBooking(id: string): Promise<Booking | null> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<Booking>(
      `/api/bookings/${id}/approve`,
      { method: "POST" },
      isBooking,
    );
    if (r) return r;
  }
  const b = fx.bookingsFixture.find((x) => x.id === id);
  if (!b) return null;
  b.status = "approved";
  b.decidedAt = new Date().toISOString();
  return b;
}

export async function declineBooking(id: string): Promise<Booking | null> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<Booking>(
      `/api/bookings/${id}/decline`,
      { method: "POST" },
      isBooking,
    );
    if (r) return r;
  }
  const b = fx.bookingsFixture.find((x) => x.id === id);
  if (!b) return null;
  b.status = "declined";
  b.decidedAt = new Date().toISOString();
  return b;
}

/** Booker confirms an approved booking. Booked -> listing.status='taken'. */
export async function confirmBooking(id: string): Promise<Booking | null> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<Booking>(
      `/api/bookings/${id}/confirm`,
      { method: "POST" },
      isBooking,
    );
    if (r) return r;
  }
  const b = fx.bookingsFixture.find((x) => x.id === id);
  if (!b) return null;
  if (b.status !== "approved") return b;
  b.status = "booked";
  b.decidedAt = new Date().toISOString();
  // Server-side effect mirror: mark the listing taken so the deck drops it.
  const listing = fx.listingsFixture.find((l) => l.id === b.listingId);
  if (listing) listing.status = "taken";
  return b;
}

// Round 3 - Roommate invite (section 13.3)
export async function inviteRoommate(
  bookingId: string,
  userId: string,
): Promise<Booking | null> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<Booking>(
      `/api/bookings/${bookingId}/roommates`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      },
      isBooking,
    );
    if (r) return r;
  }
  const b = fx.bookingsFixture.find((x) => x.id === bookingId);
  if (!b) return null;
  if (b.status !== "requested" && b.status !== "approved") return b;
  if (b.roommates.some((r) => r.id === userId)) return b;
  if (b.pendingRoommates.some((r) => r.id === userId)) return b;
  if (!fx.friendsFixture.some((f) => f.status === "accepted" && f.user.id === userId)) return b;
  const u = fx.otherUsersFixture.find((x) => x.id === userId);
  if (!u) return b;
  b.pendingRoommates.push({ id: u.id, name: u.name, avatarUrl: u.avatar_url });
  return b;
}

export async function acceptRoommateInvite(bookingId: string): Promise<Booking | null> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<Booking>(
      `/api/bookings/${bookingId}/roommates/accept`,
      { method: "POST" },
      isBooking,
    );
    if (r) return r;
  }
  const b = fx.bookingsFixture.find((x) => x.id === bookingId);
  if (!b) return null;
  if (b.status !== "requested" && b.status !== "approved") return b;
  const pending = b.pendingRoommates.find((r) => r.id === fx.meFixture.id);
  if (!pending) return b;
  b.pendingRoommates = b.pendingRoommates.filter((r) => r.id !== fx.meFixture.id);
  if (!b.roommates.some((r) => r.id === pending.id)) {
    b.roommates.push(pending);
  }
  b.viewerRole = "roommate";
  return b;
}

// Round 5 follow-up - the account belongs to the person ON the offer letter.

/**
 * Mint the account for the person the offer letter names, instead of dropping them
 * into the seeded persona. Live: POST /api/onboarding/account (admin-created auth user
 * + users row from the parse, shared demo password seam) then sign the browser into
 * it. Fixture (or any live failure - never a broken flow): the in-memory "me" takes
 * the letter's identity. EITHER WAY the new identity starts with a fresh social
 * graph: zero friends until they add someone (flock step / discovery).
 */
export async function createAccountFromOffer(
  offer: OfferParse,
): Promise<{ mode: "live"; email: string } | { mode: "fixture" }> {
  if (MODE === "live" && offer.name) {
    const r = await safeFetchJson<{ email: string; userId: string }>(
      "/api/onboarding/account",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ offer }),
      },
    );
    if (r?.email) {
      const { getSupabaseBrowser } = await import("@/lib/supabase/client");
      const supabase = getSupabaseBrowser();
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: r.email,
          password: `perch-demo-${r.email}`,
        });
        if (!error) {
          applyOfferIdentityToFixtures(offer);
          return { mode: "live", email: r.email };
        }
      }
    }
  }
  applyOfferIdentityToFixtures(offer);
  return { mode: "fixture" };
}

/** Fixture mirror of the minted account: "me" becomes the letter's person and the
 * friend graph resets to empty (friends exist only when added). In-place mutation -
 * these arrays are shared by reference across the fixture getters. */
function applyOfferIdentityToFixtures(offer: OfferParse) {
  if (offer.name && offer.name !== fx.meFixture.name) {
    fx.meFixture.name = offer.name;
    // The seeded persona's photo is not this person's photo - initials render
    // until they upload one (profile pictures are optional, RA52/RA53).
    fx.meFixture.avatar_url = null;
  }
  if (offer.employer && offer.employer !== "Unknown employer") {
    fx.meFixture.company = offer.employer;
  }
  if (offer.role) fx.meFixture.role = offer.role;
  if (offer.city) fx.meFixture.city = offer.city;
  if (offer.startDate) fx.meFixture.move_in_date = offer.startDate;
  // Fresh graph: no friends, no pending requests, no friend notes until they add
  // people themselves.
  fx.friendsFixture.length = 0;
  fx.friendRequestsFixture.length = 0;
  fx.friendNotesFixture.length = 0;
}

// Round 3 - Finance model (section 13.5)
export async function getFinance(): Promise<FinanceBreakdown> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<FinanceBreakdown>(
      "/api/finance",
      undefined,
      isFinanceBreakdown,
    );
    if (r) return r;
  }
  return fx.buildFinanceBreakdown(fx.offerParseFixture);
}

function offerFinanceUrl(offer: OfferParse): string {
  const params = new URLSearchParams();
  params.set("salary", String(offer.salary ?? 0));
  params.set("city", offer.city ?? "National");
  params.set("stipend", String(offer.relocationStipend ?? 0));
  params.set("bonus", String(offer.signingBonus ?? 0));
  return `/api/finance?${params.toString()}`;
}

/** Build a FinanceBreakdown from an offer directly (used by fixture fallbacks/tests). */
export function financeFromOffer(offer: OfferParse): FinanceBreakdown {
  return buildFinanceBreakdownFromOffer(offer);
}

/** Preview in-progress onboarding through the same finance route as persisted reads. */
export async function getFinanceForOffer(offer: OfferParse): Promise<FinanceBreakdown> {
  if (canUseLiveData()) {
    const r = await safeFetchJson<FinanceBreakdown>(
      offerFinanceUrl(offer),
      undefined,
      isFinanceBreakdown,
    );
    if (r) return r;
  }
  return financeFromOffer(offer);
}

/** Persist corrected offer fields that later finance/listing surfaces read. */
export async function saveOfferCorrections(offer: OfferParse): Promise<void> {
  if (!canUseLiveData()) return;
  await safeFetchJson(
    "/api/onboarding/offer",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        city: offer.city,
        salary: offer.salary,
        relocationStipend: offer.relocationStipend,
        signingBonus: offer.signingBonus,
      }),
    },
  );
}
