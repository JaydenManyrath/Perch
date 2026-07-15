"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Place, StickerRow } from "@/lib/types/contract";
import { env, hasMapbox } from "@/lib/env";
import { STICKER_META } from "./sticker-catalog";

/**
 * MapCanvas — Mapbox GL render with the baby-blue theme applied on load.
 * Renders place pins + sticker markers. Optionally toggles "place a sticker"
 * mode where the next map click captures a lng/lat and hands it up.
 *
 * Baby-blue theming: after 'load', iterate the style's layers and repaint
 * water/land/road/building fills to the frozen §3 tokens.
 */
export function MapCanvas({
  places,
  stickers,
  placementMode,
  onPickLocation,
}: {
  places: Place[];
  stickers: StickerRow[];
  placementMode: boolean;
  onPickLocation?: (loc: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const onPickRef = useRef(onPickLocation);
  const placementRef = useRef(placementMode);
  const [ready, setReady] = useState(false);

  // Keep callback refs current without re-running the mount effect.
  useEffect(() => {
    onPickRef.current = onPickLocation;
  }, [onPickLocation]);
  useEffect(() => {
    placementRef.current = placementMode;
    if (mapRef.current) {
      const m = mapRef.current as { getCanvas: () => HTMLCanvasElement };
      m.getCanvas().style.cursor = placementMode ? "crosshair" : "";
    }
  }, [placementMode]);

  // Initialize map once.
  useEffect(() => {
    if (!hasMapbox() || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const mbgl = (await import("mapbox-gl")).default;
      if (cancelled) return;

      // Provide the Mapbox access token.
      (mbgl as unknown as { accessToken: string }).accessToken = env.mapbox.token;

      const map = new mbgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-122.3321, 47.6062], // Seattle
        zoom: 12,
        attributionControl: false,
        cooperativeGestures: false,
      });
      mapRef.current = map;

      map.addControl(new mbgl.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new mbgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (cancelled) return;
        applyBabyBlueTheme(map as unknown as MapLike);
        setReady(true);
      });

      map.on("click", (e) => {
        if (!placementRef.current || !onPickRef.current) return;
        onPickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    })();

    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      m?.remove?.();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)render markers on data change or when map becomes ready.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let cancelled = false;
    (async () => {
      const mbgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      const map = mapRef.current as {
        addTo?: (m: unknown) => void;
      };
      // Clear previous markers.
      markersRef.current.forEach((m) => (m as { remove: () => void }).remove());
      markersRef.current = [];

      places.forEach((p) => {
        const el = document.createElement("div");
        el.className =
          "ap-place-pin inline-flex items-center gap-1 rounded-full bg-white shadow-card border border-sky-300 px-2 py-1 text-[0.7rem] font-semibold text-ink-strong cursor-default";
        el.style.transform = "translateY(-8px)";
        el.innerHTML = `<span aria-hidden>${PLACE_EMOJI[p.kind]}</span><span>${escapeHtml(p.label)}</span>`;
        if (typeof p.nearestListingMinutes === "number") {
          const chip = document.createElement("span");
          chip.className = "ml-1 rounded-full bg-accent-beak/15 text-accent-beakDeep px-1.5 py-0.5";
          chip.textContent = `${p.nearestListingMinutes} min away`;
          el.appendChild(chip);
        }
        const marker = new mbgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map as unknown as never);
        markersRef.current.push(marker);
      });

      stickers.forEach((s) => {
        const meta = STICKER_META[s.category];
        const el = document.createElement("div");
        el.className =
          "ap-sticker inline-flex items-center gap-1 rounded-full bg-sky-100 shadow-card border border-sky-200 px-2 py-1 text-[0.75rem] font-semibold text-ink-strong cursor-default";
        el.innerHTML = `<span aria-hidden style="font-size:14px">${meta.emoji}</span><span>${escapeHtml(meta.label)}</span>`;
        el.title = s.note || meta.label;
        const marker = new mbgl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map as unknown as never);
        markersRef.current.push(marker);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, places, stickers]);

  if (!hasMapbox()) {
    return (
      <div className="h-full w-full rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-body text-ink-strong font-semibold">Map needs a Mapbox token</p>
          <p className="text-caption text-ink-soft mt-1">
            Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code>.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full rounded-2xl overflow-hidden" />;
}

// ─── helpers ────────────────────────────────────────────────
const PLACE_EMOJI: Record<Place["kind"], string> = {
  coffee: "☕",
  gym: "🏋️",
  grocery: "🛒",
  transit: "🚊",
  show: "🎵",
  work: "🏢",
  other: "📍",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

type MapLike = {
  getStyle: () => { layers?: Array<{ id: string; type: string }> } | undefined;
  setPaintProperty: (id: string, prop: string, value: unknown) => void;
};

function applyBabyBlueTheme(map: MapLike) {
  const style = map.getStyle();
  if (!style?.layers) return;
  const fillColor = (id: string, color: string) => {
    try {
      map.setPaintProperty(id, "fill-color", color);
    } catch { /* layer may not exist */ }
  };
  const lineColor = (id: string, color: string) => {
    try {
      map.setPaintProperty(id, "line-color", color);
    } catch { /* layer may not exist */ }
  };
  const bgColor = (id: string, color: string) => {
    try {
      map.setPaintProperty(id, "background-color", color);
    } catch { /* layer may not exist */ }
  };

  for (const layer of style.layers) {
    const id: string = layer.id ?? "";
    if (id === "background" || id === "land") {
      bgColor(id, "#F2F9FE"); // sky.50
    } else if (id.startsWith("water") || id === "water") {
      fillColor(id, "#BFE3F7"); // sky.200
    } else if (id.startsWith("road") && layer.type === "line") {
      lineColor(id, "#FFFFFF");
    } else if (id.includes("building") && layer.type === "fill") {
      fillColor(id, "#DCEFFB"); // sky.100
    } else if (id.includes("landuse") && layer.type === "fill") {
      fillColor(id, "#EFF8FE");
    }
  }
}
