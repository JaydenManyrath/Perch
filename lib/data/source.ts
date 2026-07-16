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
 * lib/types/contract.ts - frozen by FOUNDATION-CONTRACT sections 4-6 and 11-12.
 */

import { env, hasSupabase } from "@/lib/env";
import { fetchMapboxDirections } from "@/lib/directions";
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

async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// FEED (section 4.1)
export async function getFeed(): Promise<FeedResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<FeedResponse>("/api/feed?limit=20");
    if (r) return r;
  }
  return fx.feedFixture;
}

// MATCHES (section 4.2) - connection hero
export async function getMatches(): Promise<MatchesResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<MatchesResponse>("/api/matches?limit=20");
    if (r) return r;
  }
  return fx.matchesFixture;
}

// MAP PLACES (section 4.5)
export async function getMapPlaces(): Promise<MapPlacesResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<MapPlacesResponse>("/api/map/places");
    if (r) return r;
  }
  return fx.mapPlacesFixture;
}

// ITINERARY (section 4.4)
export async function getItinerary(days = 7): Promise<ItineraryResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<ItineraryResponse>(`/api/itinerary?days=${days}`);
    if (r) return r;
  }
  return fx.itineraryFixture;
}

// ONBOARDING (section 4.6)
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

// SUPABASE TABLES (section 2)
export async function getMe(): Promise<UserRow> {
  return fx.meFixture;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const all = [fx.meFixture, ...fx.otherUsersFixture, ...fx.sublettersFixture];
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
  // Include subletters in the lookup so messaging a host from a subletter
  // profile doesn't leave the DM list with peer=undefined.
  const allUsers = [fx.meFixture, ...fx.otherUsersFixture, ...fx.sublettersFixture];
  const rows = fx.conversationsFixture.filter((c) => c.participant_ids.includes(userId));
  return rows
    .map((c) => {
      const peerId = c.participant_ids.find((p) => p !== userId);
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

export async function getConversationMessages(conversationId: string): Promise<MessageRow[]> {
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
): Promise<ConversationRow> {
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

export function isLiveSupabase(): boolean {
  return MODE === "live" && hasSupabase();
}

export function currentMode(): "fixture" | "live" {
  return MODE;
}

export type { TasteProfile };

// ROUND 2 - Perches swipe deck + saved tray (section 11.3)

/** Client-side swipe memory. In fixture mode this is the source of truth. */
const swipedRight = new Set<string>(fx.savedPerchesFixture.map((p) => p.id));
const swipedLeft = new Set<string>();

export async function getPerchDeck(): Promise<PerchDeckResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<PerchDeckResponse>("/api/perches");
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
  if (MODE === "live") {
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

export async function getSavedPerches(): Promise<PerchCard[]> {
  if (MODE === "live") {
    const r = await safeFetchJson<{ deck: PerchCard[] } | PerchCard[]>("/api/perches/saved");
    if (r) return Array.isArray(r) ? r : r.deck;
  }
  return fx.savedPerchesFixture.slice();
}

// ROUND 2 - Subletter posting + freshness (section 11.4, 11.2)
export async function postListing(input: PostListingInput): Promise<ListingRow> {
  if (MODE === "live") {
    const r = await safeFetchJson<ListingRow>("/api/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (r) return r;
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
  if (MODE === "live") {
    const r = await safeFetchJson<{ status: ListingStatus }>(`/api/listings/${id}/confirm`, {
      method: "POST",
    });
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
  if (MODE === "live") {
    const r = await safeFetchJson<ReviewsResponse>(
      `/api/reviews?subjectType=${encodeURIComponent(subjectType)}&subjectId=${encodeURIComponent(subjectId)}`,
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
  if (MODE === "live") {
    const r = await safeFetchJson<Review>("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
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
  if (MODE === "live") {
    const r = await safeFetchJson<AttendResponse>(`/api/events/${eventId}/attend`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
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
  if (MODE === "live") {
    const r = await safeFetchJson<EventCommentsResponse>(`/api/events/${eventId}/comments`);
    if (r) return r;
  }
  const comments = fx.eventCommentsFixture
    .filter((c) => c.eventId === eventId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { comments };
}

export async function postEventComment(eventId: string, input: PostEventCommentInput): Promise<EventComment> {
  if (MODE === "live") {
    const r = await safeFetchJson<EventComment>(`/api/events/${eventId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
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
export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  if (MODE === "live") {
    const r = await safeFetchJson<PublicProfile>(`/api/users/${id}`);
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
}): Promise<MapCommentsResponse> {
  if (MODE === "live") {
    const q = bbox
      ? `?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`
      : "";
    const r = await safeFetchJson<MapCommentsResponse>(`/api/map/comments${q}`);
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
  if (MODE === "live") {
    const r = await safeFetchJson<MapComment>("/api/map/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
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
export async function getFriends(): Promise<FriendsResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<FriendsResponse>("/api/friends");
    if (r) return r;
  }
  return { friends: fx.friendsFixture.slice() };
}

export async function getFriendRequests(): Promise<FriendRequestsResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<FriendRequestsResponse>("/api/friends/requests");
    if (r) return r;
  }
  return { requests: fx.friendRequestsFixture.slice() };
}

export async function requestFriend(userId: string): Promise<Friend | null> {
  if (MODE === "live") {
    const r = await safeFetchJson<Friend>("/api/friends/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
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
  if (MODE === "live") {
    const r = await safeFetchJson<Friend>(`/api/friends/${userId}/accept`, {
      method: "POST",
    });
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
  if (MODE === "live") {
    await safeFetchJson(`/api/friends/${userId}/decline`, { method: "POST" });
  }
  const idx = fx.friendRequestsFixture.findIndex(
    (f) => f.user.id === userId && f.direction === "incoming",
  );
  if (idx >= 0) fx.friendRequestsFixture.splice(idx, 1);
}

export async function getFriendNotes(): Promise<FriendNotesResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<FriendNotesResponse>("/api/friends/notes");
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
  if (MODE === "live") {
    const r = await safeFetchJson<RouteResponse>("/api/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
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
  if (MODE === "live") {
    const r = await safeFetchJson<RoutePoisResponse>("/api/route/pois", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (r) return r;
  }
  const pois: RoutePoi[] = fx.findPoisAlongRoute(input.geometry, input.kinds);
  return { pois };
}

export async function buildCommuteSchedule(input: {
  apartmentId: string;
  selectedPlaceIds: string[];
}): Promise<CommuteScheduleResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<CommuteScheduleResponse>("/api/route/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (r) return r;
  }
  return fx.buildScheduleFromSelections(input);
}

// Round 3 - Comprehensive listing detail (section 13.2)
export async function getListingDetail(id: string): Promise<ListingDetail | null> {
  if (MODE === "live") {
    const r = await safeFetchJson<ListingDetail>(`/api/listings/${id}`);
    if (r) return r;
  }
  return fx.listingDetailFor(id);
}

// Round 3 - Booking flow (section 13.4)
export async function getBookings(userId: string): Promise<BookingsResponse> {
  if (MODE === "live") {
    const r = await safeFetchJson<BookingsResponse>("/api/bookings");
    if (r) return r;
  }
  // Fixture: find my bookings + bookings against my listings.
  const all = fx.bookingsFixture;
  const myListingIds = new Set(
    fx.listingsFixture.filter((l) => l.created_by === userId).map((l) => l.id),
  );
  const mine = all.filter(
    (b) =>
      b.booker.id === userId ||
      b.roommates.some((r) => r.id === userId),
  );
  const incoming = all.filter((b) => myListingIds.has(b.listingId));
  return { mine, incoming };
}

export async function requestBooking(
  listingId: string,
  input: BookRequestInput,
): Promise<Booking> {
  if (MODE === "live") {
    const r = await safeFetchJson<Booking>(`/api/listings/${listingId}/book`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (r) return r;
  }
  const me = fx.meFixture;
  const roommates = (input.roommateIds ?? [])
    .map((id) => {
      const u = [me, ...fx.otherUsersFixture].find((x) => x.id === id);
      return u ? { id: u.id, name: u.name, avatarUrl: u.avatar_url } : null;
    })
    .filter((r): r is { id: string; name: string; avatarUrl: string | null } => !!r);
  const row: Booking = {
    id: `book-${me.id}-${listingId}-${Date.now()}`,
    listingId,
    booker: { id: me.id, name: me.name, avatarUrl: me.avatar_url },
    roommates,
    status: "requested",
    createdAt: new Date().toISOString(),
    decidedAt: null,
  };
  fx.bookingsFixture.unshift(row);
  return row;
}

export async function approveBooking(id: string): Promise<Booking | null> {
  if (MODE === "live") {
    const r = await safeFetchJson<Booking>(`/api/bookings/${id}/approve`, {
      method: "POST",
    });
    if (r) return r;
  }
  const b = fx.bookingsFixture.find((x) => x.id === id);
  if (!b) return null;
  b.status = "approved";
  b.decidedAt = new Date().toISOString();
  return b;
}

export async function declineBooking(id: string): Promise<Booking | null> {
  if (MODE === "live") {
    const r = await safeFetchJson<Booking>(`/api/bookings/${id}/decline`, {
      method: "POST",
    });
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
  if (MODE === "live") {
    const r = await safeFetchJson<Booking>(`/api/bookings/${id}/confirm`, {
      method: "POST",
    });
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
  if (MODE === "live") {
    const r = await safeFetchJson<Booking>(`/api/bookings/${bookingId}/roommates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (r) return r;
  }
  const b = fx.bookingsFixture.find((x) => x.id === bookingId);
  if (!b) return null;
  if (b.roommates.some((r) => r.id === userId)) return b;
  const u = fx.otherUsersFixture.find((x) => x.id === userId);
  if (!u) return b;
  b.roommates.push({ id: u.id, name: u.name, avatarUrl: u.avatar_url });
  return b;
}

// Round 3 - Finance model (section 13.5)
export async function getFinance(): Promise<FinanceBreakdown> {
  if (MODE === "live") {
    const r = await safeFetchJson<FinanceBreakdown>("/api/finance");
    if (r) return r;
  }
  return fx.buildFinanceBreakdown(fx.offerParseFixture);
}

/** Build a FinanceBreakdown from an offer directly (used by onboarding summary). */
export function financeFromOffer(offer: OfferParse): FinanceBreakdown {
  return fx.buildFinanceBreakdown(offer);
}
