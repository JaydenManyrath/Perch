import "server-only";

import { headers } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import * as source from "@/lib/data/source";
import type { LiveDataContext } from "@/lib/data/source";

export { currentMode, participantsFromConversationId } from "@/lib/data/source";

async function liveContext(): Promise<LiveDataContext | undefined> {
  if (source.currentMode() !== "live") return undefined;

  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const cookie = requestHeaders.get("cookie");

  const serverFetch: typeof fetch = (input, init) => {
    const url =
      typeof input === "string" && input.startsWith("/")
        ? `${origin}${input}`
        : input;
    const outgoingHeaders = new Headers(init?.headers);
    if (cookie && !outgoingHeaders.has("cookie")) outgoingHeaders.set("cookie", cookie);
    return fetch(url, { ...init, headers: outgoingHeaders, cache: "no-store" });
  };

  return {
    supabase: await createServerSupabase(),
    fetch: serverFetch,
  };
}

export async function getFeed() {
  return source.getFeed(await liveContext());
}

export async function getMatches() {
  return source.getMatches(await liveContext());
}

export async function getMapPlaces() {
  return source.getMapPlaces(await liveContext());
}

export async function getItinerary(days = 7) {
  return source.getItinerary(days, await liveContext());
}

export async function getMe() {
  return source.getMe(await liveContext());
}

export async function getUserById(id: string) {
  return source.getUserById(id, await liveContext());
}

export async function getListings() {
  return source.getListings(await liveContext());
}

export async function getStickers() {
  return source.getStickers(await liveContext());
}

export async function getEvents() {
  return source.getEvents(await liveContext());
}

export async function getChecklist(userId: string) {
  return source.getChecklist(userId, await liveContext());
}

export async function getConversationsForUser(userId: string) {
  return source.getConversationsForUser(userId, await liveContext());
}

export async function findOrCreateConversation(meId: string, otherId: string) {
  return source.findOrCreateConversation(meId, otherId, await liveContext());
}

export async function getPerchDeck() {
  return source.getPerchDeck(await liveContext());
}

export async function getSavedPerches() {
  return source.getSavedPerches(await liveContext());
}

export async function getPublicProfile(id: string) {
  return source.getPublicProfile(id, await liveContext());
}

export async function getMapComments(bbox?: {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}) {
  return source.getMapComments(bbox, await liveContext());
}

export async function getFriends() {
  return source.getFriends(await liveContext());
}

export async function getFriendRequests() {
  return source.getFriendRequests(await liveContext());
}

export async function getListingDetail(id: string) {
  return source.getListingDetail(id, await liveContext());
}
