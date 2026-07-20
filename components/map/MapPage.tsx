"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, X, MessageCircle } from "lucide-react";
import { MapCanvas, type MapClickMode, type MapLayerKey } from "./MapCanvas";
import { PlaceStickerSheet } from "./PlaceStickerSheet";
import { PlaceInfoSheet } from "./PlaceInfoSheet";
import { CommentSheet } from "./CommentSheet";
import { EventPreviewSheet } from "./EventPreviewSheet";
import { ListingInfoSheet } from "./ListingInfoSheet";
import { StickerReadSheet } from "./StickerReadSheet";
import { MapLegend } from "./MapLegend";
import { CommutePlanPanel } from "./CommutePlanPanel";
import { officeCoordsForCompany } from "./office-coords";
import { Chip } from "@/components/ui/Chip";
import { STICKER_ORDER } from "./sticker-catalog";
import { cn } from "@/lib/utils";
import type {
  Place,
  StickerRow,
  StickerCategory,
  EventRow,
  ListingRow,
  MapComment,
  UserRow,
  GeoJSONLineString,
  RoutePoi,
  ItineraryDay,
} from "@/lib/types/contract";
import {
  insertSticker,
  addMapComment,
  planRoute,
  getRoutePois,
  buildCommuteSchedule,
} from "@/lib/data/source";

/**
 * MapPage (RA7 + RA12 + RA19) - the interactive map surface with all round-2
 * layers. Decision-adjacent, so no mascot on the map itself.
 */
export function MapPage({
  me,
  places,
  initialStickers,
  events,
  listings,
  initialComments,
  initialApartmentId,
}: {
  me: UserRow;
  places: Place[];
  initialStickers: StickerRow[];
  events: EventRow[];
  listings: ListingRow[];
  initialComments: MapComment[];
  initialApartmentId: string | null;
}) {
  const [stickers, setStickers] = useState<StickerRow[]>(initialStickers);
  const [comments, setComments] = useState<MapComment[]>(initialComments);
  const [clickMode, setClickMode] = useState<MapClickMode>("none");
  const [pickedStickerLoc, setPickedStickerLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [stickerSheetOpen, setStickerSheetOpen] = useState(false);
  const [pickedCommentLoc, setPickedCommentLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [commentMode, setCommentMode] = useState<"read" | "add" | null>(null);
  const [openComment, setOpenComment] = useState<MapComment | null>(null);
  const [openPlace, setOpenPlace] = useState<Place | null>(null);
  const [openEvent, setOpenEvent] = useState<EventRow | null>(null);
  // RA38 - info sheets for listing + sticker markers.
  const [openListing, setOpenListing] = useState<ListingRow | null>(null);
  const [openSticker, setOpenSticker] = useState<StickerRow | null>(null);

  // Commute plan state (RA19).
  const [apartmentId, setApartmentId] = useState<string | null>(initialApartmentId);
  // Legend declutter: layers the user has toggled off (office is always shown).
  const [hiddenLayers, setHiddenLayers] = useState<Set<MapLayerKey>>(new Set());
  const toggleLayer = (key: MapLayerKey) =>
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const apartment = apartmentId ? listings.find((l) => l.id === apartmentId) ?? null : null;
  const officeLocation = officeCoordsForCompany(me.company);
  const [routeGeometry, setRouteGeometry] = useState<GeoJSONLineString | null>(null);
  const [routeDist, setRouteDist] = useState<number | null>(null);
  const [routeDur, setRouteDur] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [poiKinds, setPoiKinds] = useState<Set<"coffee" | "gym">>(new Set(["coffee"]));
  const [pois, setPois] = useState<RoutePoi[]>([]);
  const [selectedPoiIds, setSelectedPoiIds] = useState<Set<string>>(new Set());
  const [schedule, setSchedule] = useState<ItineraryDay | null>(null);

  // Fetch the route whenever the apartment changes.
  useEffect(() => {
    let cancelled = false;
    if (!apartment) {
      setRouteGeometry(null);
      setRouteDist(null);
      setRouteDur(null);
      setPois([]);
      setSelectedPoiIds(new Set());
      setSchedule(null);
      return;
    }
    setRouteLoading(true);
    setSchedule(null);
    (async () => {
      const r = await planRoute({
        officeLat: officeLocation.lat,
        officeLng: officeLocation.lng,
        apartmentLat: apartment.lat,
        apartmentLng: apartment.lng,
      });
      if (cancelled) return;
      setRouteGeometry(r.geometry);
      setRouteDist(r.distanceMeters);
      setRouteDur(r.durationSeconds);
      setRouteLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [apartment, officeLocation.lat, officeLocation.lng]);

  // Fetch POIs whenever the route or kinds change.
  useEffect(() => {
    let cancelled = false;
    if (!routeGeometry) {
      setPois([]);
      return;
    }
    (async () => {
      const r = await getRoutePois({
        geometry: routeGeometry,
        kinds: Array.from(poiKinds),
      });
      if (cancelled) return;
      setPois(r.pois);
    })();
    return () => {
      cancelled = true;
    };
  }, [routeGeometry, poiKinds]);

  // Sticker placement.
  function onStickerMode() {
    setClickMode((m) => (m === "sticker" ? "none" : "sticker"));
    if (clickMode !== "sticker") setPickedStickerLoc(null);
  }
  function onCommentMode() {
    setClickMode((m) => (m === "comment" ? "none" : "comment"));
    if (clickMode !== "comment") setPickedCommentLoc(null);
  }

  function handleMapClick(loc: { lat: number; lng: number }) {
    if (clickMode === "sticker") {
      setPickedStickerLoc(loc);
      setStickerSheetOpen(true);
      setClickMode("none");
    } else if (clickMode === "comment") {
      setPickedCommentLoc(loc);
      setCommentMode("add");
      setClickMode("none");
    }
  }

  async function submitSticker({ category, note }: { category: StickerCategory; note: string }) {
    if (!pickedStickerLoc) return;
    const row = await insertSticker({ ...pickedStickerLoc, category, note });
    setStickers((prev) => [row, ...prev]);
    setPickedStickerLoc(null);
  }

  async function submitComment(input: { topic: string; body: string; lat: number; lng: number }) {
    const row = await addMapComment(input);
    setComments((prev) => [row, ...prev]);
    setPickedCommentLoc(null);
    setCommentMode(null);
  }

  function toggleSelectedPoi(id: string) {
    setSelectedPoiIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generateSchedule() {
    if (!apartment) return;
    const r = await buildCommuteSchedule({
      apartmentId: apartment.id,
      selectedPlaceIds: Array.from(selectedPoiIds),
    });
    setSchedule(r.day);
  }

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="mb-3">
        <h1 className="text-h1 text-ink-strong">Map</h1>
        <p className="text-caption text-ink-soft">
          Places, stickers, events, and comments - one map for everything about
          your city.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={onStickerMode}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 font-semibold text-caption shadow-card transition-colors",
            clickMode === "sticker"
              ? "bg-sky-500 text-white"
              : "bg-white border border-sky-300 text-ink-strong hover:bg-sky-100",
          )}
          aria-pressed={clickMode === "sticker"}
        >
          {clickMode === "sticker" ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {clickMode === "sticker" ? "Cancel sticker" : "Leave a sticker"}
        </button>
        <button
          type="button"
          onClick={onCommentMode}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 font-semibold text-caption shadow-card transition-colors",
            clickMode === "comment"
              ? "bg-sky-500 text-white"
              : "bg-white border border-sky-300 text-ink-strong hover:bg-sky-100",
          )}
          aria-pressed={clickMode === "comment"}
        >
          {clickMode === "comment" ? <X className="h-4 w-4" aria-hidden /> : <MessageCircle className="h-4 w-4" aria-hidden />}
          {clickMode === "comment" ? "Cancel comment" : "Drop a comment"}
        </button>
        <span className="text-caption text-ink-soft">
          {clickMode === "sticker"
            ? "Tap the map to pick a spot."
            : clickMode === "comment"
            ? "Tap the map to anchor a comment."
            : `${stickers.length} sticker${stickers.length === 1 ? "" : "s"} - ${comments.length} comment${comments.length === 1 ? "" : "s"} - ${events.length} events`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-caption text-ink-soft">Show:</span>
        {([
          ["listings", "Listings"],
          ["events", "Events"],
          ["stickers", "Stickers"],
          ["comments", "Comments"],
          ["places", "Places"],
        ] as const).map(([key, label]) => {
          const shown = !hiddenLayers.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleLayer(key)}
              aria-pressed={shown}
              className={cn(
                "rounded-full border px-3 py-1 text-caption font-semibold transition",
                shown
                  ? "border-sky-400 bg-sky-100 text-ink-strong"
                  : "border-sky-200 bg-white text-ink-soft line-through",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl overflow-hidden border border-sky-200 shadow-card h-[62dvh] md:h-[70dvh] relative">
        <MapCanvas
          places={places}
          stickers={stickers}
          events={events}
          listings={listings}
          highlightedListingId={apartmentId}
          officeLocation={officeLocation}
          hiddenLayers={hiddenLayers}
          mapComments={comments}
          routeGeometry={routeGeometry}
          routePois={pois}
          selectedPoiIds={selectedPoiIds}
          clickMode={clickMode}
          onMapClick={handleMapClick}
          onEventClick={(id) => setOpenEvent(events.find((e) => e.id === id) ?? null)}
          onPlaceClick={(id) => setOpenPlace(places.find((p) => p.id === id) ?? null)}
          onCommentClick={(id) => {
            const c = comments.find((c) => c.id === id) ?? null;
            setOpenComment(c);
            setCommentMode(c ? "read" : null);
          }}
          onListingClick={(id) => {
            const l = listings.find((x) => x.id === id) ?? null;
            setOpenListing(l);
          }}
          onStickerClick={(id) => {
            const s = stickers.find((x) => x.id === id) ?? null;
            setOpenSticker(s);
          }}
          onPoiClick={toggleSelectedPoi}
        />
      </div>

      <div className="mt-3">
        <MapLegend />
      </div>

      <CommutePlanPanel
        apartment={apartment}
        distanceMeters={routeDist}
        durationSeconds={routeDur}
        loading={routeLoading}
        kinds={poiKinds}
        onKindsChange={setPoiKinds}
        pois={pois}
        selectedIds={selectedPoiIds}
        onTogglePoi={toggleSelectedPoi}
        onBuildSchedule={generateSchedule}
        schedule={schedule}
        onClear={() => setApartmentId(null)}
        routeGeometry={routeGeometry}
      />

      <section className="mt-6">
        <h2 className="text-h2 text-ink-strong mb-2">Sticker categories</h2>
        <p className="text-caption text-ink-soft mb-2">
          POSITIVE only - no avoid/unsafe categories exist in the UI.
        </p>
        <div className="flex flex-wrap gap-2">
          {STICKER_ORDER.map((m) => (
            <Chip key={m.category}>
              <span aria-hidden>{m.emoji}</span> {m.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-h2 text-ink-strong mb-2">Your life-map</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {places.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-3 rounded-2xl bg-white border border-sky-100 p-3 shadow-card"
            >
              <MapPin className="h-5 w-5 text-sky-400 mt-0.5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink-strong truncate">{p.label}</span>
                  {typeof p.nearestListingMinutes === "number" ? (
                    <span className="text-caption font-semibold text-accent-beakDeep whitespace-nowrap">
                      {p.nearestListingMinutes} min away
                    </span>
                  ) : null}
                </div>
                <p className="text-caption text-ink-soft capitalize">
                  {p.kind} - seen {p.frequency} times
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <PlaceStickerSheet
        open={stickerSheetOpen}
        onOpenChange={(o) => {
          setStickerSheetOpen(o);
          if (!o) setPickedStickerLoc(null);
        }}
        location={pickedStickerLoc}
        onSubmit={submitSticker}
      />

      <CommentSheet
        mode={commentMode}
        comment={openComment}
        location={pickedCommentLoc}
        onOpenChange={(o) => {
          if (!o) {
            setCommentMode(null);
            setOpenComment(null);
            setPickedCommentLoc(null);
          }
        }}
        onSubmit={submitComment}
      />

      <PlaceInfoSheet
        place={openPlace}
        onOpenChange={(o) => !o && setOpenPlace(null)}
      />

      <EventPreviewSheet
        event={openEvent}
        open={openEvent !== null}
        onOpenChange={(o) => !o && setOpenEvent(null)}
      />

      <ListingInfoSheet
        listing={openListing}
        isCommuteAnchor={openListing?.id === apartmentId}
        onOpenChange={(o) => !o && setOpenListing(null)}
        onUseAsCommuteAnchor={(id) => {
          setApartmentId(id);
          setOpenListing(null);
        }}
      />

      <StickerReadSheet
        sticker={openSticker}
        author={authorForSticker(openSticker, [me, ...seededAuthors(comments)])}
        onOpenChange={(o) => !o && setOpenSticker(null)}
      />
    </div>
  );
}

/**
 * Resolve a sticker author from anyone we already have on this page (the
 * viewer + any users referenced by map comments). The map surface intentionally
 * doesn't fetch the whole user table just to render a badge; if we can't find
 * the user, the sheet just shows "unknown author".
 */
function authorForSticker(
  sticker: StickerRow | null,
  candidates: Array<Pick<UserRow, "id" | "name" | "avatar_url">>,
): Pick<UserRow, "id" | "name" | "avatar_url"> | null {
  if (!sticker) return null;
  return candidates.find((u) => u.id === sticker.created_by) ?? null;
}

function seededAuthors(comments: MapComment[]): Array<Pick<UserRow, "id" | "name" | "avatar_url">> {
  return comments.map((c) => ({
    id: c.author.id,
    name: c.author.name,
    avatar_url: c.author.avatarUrl,
  }));
}
