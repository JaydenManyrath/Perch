"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type {
  Place,
  StickerRow,
  EventRow,
  ListingRow,
  MapComment,
  GeoJSONLineString,
  RoutePoi,
} from "@/lib/types/contract";
import { env, hasMapbox } from "@/lib/env";
import {
  markerHtml,
  eventKindFor,
  placeKindFor,
  STICKER_META_HTML_HINT,
} from "./icon-utils";

export type MapClickMode = "none" | "sticker" | "comment";
/** Toggleable marker layers for the legend declutter controls (office is always shown). */
export type MapLayerKey = "places" | "stickers" | "events" | "listings" | "comments";

/**
 * MapCanvas - Mapbox GL render + all Round 2 layers.
 * Renders places (RA7 icons), stickers, events (RA7 event pins), listings,
 * map comments (RA12), the highlighted apartment + office (RA19), and an
 * optional colored commute polyline (RA19).
 * Baby-blue theme + Google-Maps-style circular category pins.
 */
export function MapCanvas({
  places,
  stickers,
  events,
  listings,
  highlightedListingId,
  officeLocation,
  mapComments,
  routeGeometry,
  routePois,
  selectedPoiIds,
  clickMode,
  hiddenLayers,
  onMapClick,
  onEventClick,
  onStickerClick,
  onPlaceClick,
  onListingClick,
  onCommentClick,
  onPoiClick,
}: {
  places: Place[];
  stickers: StickerRow[];
  events: EventRow[];
  listings: ListingRow[];
  highlightedListingId?: string | null;
  officeLocation?: { lat: number; lng: number } | null;
  mapComments: MapComment[];
  routeGeometry?: GeoJSONLineString | null;
  routePois?: RoutePoi[];
  selectedPoiIds?: Set<string>;
  clickMode: MapClickMode;
  /** Layer categories the user has toggled off in the legend (declutter). */
  hiddenLayers?: Set<MapLayerKey>;
  onMapClick?: (coord: { lat: number; lng: number }) => void;
  onEventClick?: (id: string) => void;
  onStickerClick?: (id: string) => void;
  onPlaceClick?: (id: string) => void;
  onListingClick?: (id: string) => void;
  onCommentClick?: (id: string) => void;
  onPoiClick?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const clickModeRef = useRef(clickMode);
  const onMapClickRef = useRef(onMapClick);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    clickModeRef.current = clickMode;
    if (mapRef.current) {
      const m = mapRef.current as { getCanvas: () => HTMLCanvasElement };
      m.getCanvas().style.cursor = clickMode !== "none" ? "crosshair" : "";
    }
  }, [clickMode]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Init map once.
  useEffect(() => {
    if (!hasMapbox() || !containerRef.current) return;
    let cancelled = false;
    const loadTimeout = window.setTimeout(() => {
      if (!cancelled) setLoadFailed(true);
    }, 8_000);

    (async () => {
      try {
      const mbgl = (await import("mapbox-gl")).default;
      if (cancelled) return;

      (mbgl as unknown as { accessToken: string }).accessToken = env.mapbox.token;

      const map = new mbgl.Map({
        container: containerRef.current!,
        // Streets v12 is the detailed Google-Maps-like base: road names,
        // building outlines, POI icons, park green, water blue. We overlay a
        // subtle water tint below for Perch flavor.
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-122.3321, 47.6062],
        zoom: 12,
        attributionControl: false,
        cooperativeGestures: false,
      });
      mapRef.current = map;
      map.addControl(new mbgl.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new mbgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (cancelled) return;
        window.clearTimeout(loadTimeout);
        applyBabyBlueTheme(map as unknown as MapLike);
        setReady(true);
      });

      map.on("click", (e) => {
        if (clickModeRef.current === "none" || !onMapClickRef.current) return;
        onMapClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
      } catch {
        window.clearTimeout(loadTimeout);
        if (!cancelled) setLoadFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeout);
      const m = mapRef.current as { remove?: () => void } | null;
      m?.remove?.();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route source/layer sync.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current as MapWithSources;
    const src = "ap-route";
    if (routeGeometry) {
      const feature = {
        type: "Feature" as const,
        properties: {},
        geometry: routeGeometry,
      };
      const existing = map.getSource(src);
      if (existing) {
        (existing as { setData: (d: unknown) => void }).setData({
          type: "FeatureCollection",
          features: [feature],
        });
      } else {
        map.addSource(src, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [feature] },
        });
        map.addLayer({
          id: "ap-route-line",
          type: "line",
          source: src,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#F6A22C",
            "line-width": 5,
            "line-opacity": 0.9,
          },
        });
      }
      try {
        const coords = routeGeometry.coordinates;
        if (coords.length >= 2) {
          let minLng = coords[0][0];
          let maxLng = coords[0][0];
          let minLat = coords[0][1];
          let maxLat = coords[0][1];
          for (const [lng, lat] of coords) {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
          const bounds: [[number, number], [number, number]] = [
            [minLng, minLat],
            [maxLng, maxLat],
          ];
          (map as unknown as {
            fitBounds: (b: unknown, o?: unknown) => void;
          }).fitBounds(bounds, { padding: 60, duration: 700 });
        }
      } catch {
        /* fitBounds optional */
      }
    } else {
      try {
        if (map.getLayer("ap-route-line")) map.removeLayer("ap-route-line");
        if (map.getSource(src)) map.removeSource(src);
      } catch {
        /* ok */
      }
    }
  }, [ready, routeGeometry]);

  // (Re)render markers on data change.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let cancelled = false;
    (async () => {
      const mbgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      const map = mapRef.current as unknown as never;

      markersRef.current.forEach((m) => (m as { remove: () => void }).remove());
      markersRef.current = [];

      const hidden = hiddenLayers ?? new Set<MapLayerKey>();

      if (!hidden.has("places")) places.forEach((p) => {
        const el = mkEl(markerHtml(placeKindFor(p.kind), { size: 30 }), () => onPlaceClick?.(p.id));
        el.title = p.label;
        const marker = new mbgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
        markersRef.current.push(marker);
      });

      if (!hidden.has("stickers")) stickers.forEach((s) => {
        const el = mkEl(
          `<span class="ap-marker inline-flex items-center justify-center rounded-full shadow-card bg-sky-100 ring-2 ring-sky-400/40" style="width:30px;height:30px;font-size:16px;line-height:1" title="${STICKER_META_HTML_HINT(
            s.category,
          )}"><span aria-hidden>${stickerEmoji(s.category)}</span></span>`,
          () => onStickerClick?.(s.id),
        );
        const marker = new mbgl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
        markersRef.current.push(marker);
      });

      if (!hidden.has("events")) events.forEach((ev) => {
        const el = mkEl(markerHtml(eventKindFor(ev.category), { size: 34 }), () =>
          onEventClick?.(ev.id),
        );
        el.title = ev.title;
        const marker = new mbgl.Marker({ element: el }).setLngLat([ev.lng, ev.lat]).addTo(map);
        markersRef.current.push(marker);
      });

      // The selected apartment stays visible even when listings are hidden (it anchors the route).
      listings.forEach((l) => {
        const highlighted = l.id === highlightedListingId;
        if (hidden.has("listings") && !highlighted) return;
        const el = mkEl(
          markerHtml(highlighted ? "listing-highlighted" : "listing", {
            size: highlighted ? 44 : 26,
            // Google-Maps-style label + area halo for the selected apartment.
            label: highlighted ? l.title : undefined,
            halo: highlighted,
          }),
          () => onListingClick?.(l.id),
        );
        el.title = l.title;
        // Anchor: keep the marker centered under the halo.
        const marker = new mbgl.Marker({ element: el, anchor: "center" })
          .setLngLat([l.lng, l.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });

      if (officeLocation) {
        const el = mkEl(
          markerHtml("office", { size: 38, label: "Office", halo: true }),
        );
        el.title = "Your office";
        const marker = new mbgl.Marker({ element: el, anchor: "center" })
          .setLngLat([officeLocation.lng, officeLocation.lat])
          .addTo(map);
        markersRef.current.push(marker);
      }

      if (!hidden.has("comments")) mapComments.forEach((c) => {
        const el = mkEl(markerHtml("comment", { size: 28 }), () => onCommentClick?.(c.id));
        el.title = c.topic;
        const marker = new mbgl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
        markersRef.current.push(marker);
      });

      (routePois ?? []).forEach((poi) => {
        const isSelected = selectedPoiIds?.has(poi.place.id) ?? false;
        const el = mkEl(
          markerHtml("poi-candidate", { size: isSelected ? 32 : 24, selected: isSelected }),
          () => onPoiClick?.(poi.place.id),
        );
        el.title = `${poi.place.label} (${Math.round(poi.distanceFromRouteMeters)}m off route)`;
        const marker = new mbgl.Marker({ element: el })
          .setLngLat([poi.place.lng, poi.place.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    places,
    stickers,
    events,
    listings,
    highlightedListingId,
    officeLocation,
    mapComments,
    hiddenLayers,
    routePois,
    selectedPoiIds,
    onEventClick,
    onStickerClick,
    onPlaceClick,
    onListingClick,
    onCommentClick,
    onPoiClick,
  ]);

  if (!hasMapbox() || loadFailed) {
    return (
      <div className="h-full w-full rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-body text-ink-strong font-semibold">
            {loadFailed ? "Mapbox could not load" : "Map needs a Mapbox token"}
          </p>
          <p className="text-caption text-ink-soft mt-1">
            {loadFailed
              ? "Check the public token or network connection, then try again."
              : <>Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code>.env.local</code>.</>}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full rounded-2xl overflow-hidden" />;
}

// ─── helpers ────────────────────────────────────────────────

function mkEl(html: string, onClick?: () => void): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  const child = el.firstElementChild as HTMLElement;
  if (onClick) {
    (child ?? el).style.cursor = "pointer";
    (child ?? el).addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
  }
  return el;
}

function stickerEmoji(category: string): string {
  const map: Record<string, string> = {
    good_coffee: "☕",
    safe_feeling: "🛡",
    interns_hang: "👋",
    good_vibe: "✨",
    great_food: "🍜",
    green_space: "🌳",
  };
  return map[category] ?? "✨";
}

type MapLike = {
  getStyle: () => { layers?: Array<{ id: string; type: string }> } | undefined;
  setPaintProperty: (id: string, prop: string, value: unknown) => void;
};

type MapWithSources = MapLike & {
  addSource: (id: string, opts: unknown) => void;
  removeSource: (id: string) => void;
  getSource: (id: string) => unknown;
  addLayer: (opts: unknown) => void;
  removeLayer: (id: string) => void;
  getLayer: (id: string) => unknown;
};

function applyBabyBlueTheme(map: MapLike) {
  // Keep the Streets base LEGIBLE (roads, buildings, POI icons visible) but
  // add a subtle Perch touch: water tinted toward sky.200. Anything more
  // erases the Google-Maps-like detail we want.
  const style = map.getStyle();
  if (!style?.layers) return;
  const fillColor = (id: string, color: string) => {
    try {
      map.setPaintProperty(id, "fill-color", color);
    } catch {
      /* ok */
    }
  };
  for (const layer of style.layers) {
    const id: string = layer.id ?? "";
    if (id.startsWith("water") || id === "water") fillColor(id, "#BFE3F7"); // sky.200
  }
}
