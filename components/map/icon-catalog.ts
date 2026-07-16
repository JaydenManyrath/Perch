/**
 * Icon + color mapping for map markers (RA7).
 * We render simple emoji in colored circles - lightweight, works everywhere,
 * scans quickly on a colored map. Google-Maps-like recognizability without a
 * custom sprite sheet.
 */

export type MarkerVisual = {
  emoji: string;
  label: string;
  /** Tailwind bg + text used on the pin's colored circle. */
  bg: string;
  ring: string;
};

/** Kinds A wants to render on the map. */
export type MarkerKind =
  | "place-coffee"
  | "place-gym"
  | "place-grocery"
  | "place-transit"
  | "place-show"
  | "place-work"
  | "place-other"
  | "sticker"
  | "event"
  | "event-music"
  | "event-outdoors"
  | "event-food"
  | "event-social"
  | "listing"
  | "listing-highlighted"
  | "comment"
  | "office"
  | "poi-candidate";

export const ICON_MAP: Record<MarkerKind, MarkerVisual> = {
  "place-coffee":   { emoji: "☕", label: "Coffee",  bg: "bg-white", ring: "ring-amber-500/40" },
  "place-gym":      { emoji: "🏋", label: "Gym",     bg: "bg-white", ring: "ring-emerald-500/40" },
  "place-grocery":  { emoji: "🛒", label: "Grocery", bg: "bg-white", ring: "ring-lime-500/40" },
  "place-transit":  { emoji: "🚊", label: "Transit", bg: "bg-white", ring: "ring-sky-500/40" },
  "place-show":     { emoji: "🎵", label: "Venue",   bg: "bg-white", ring: "ring-purple-500/40" },
  "place-work":     { emoji: "🏢", label: "Office",  bg: "bg-white", ring: "ring-slate-500/40" },
  "place-other":    { emoji: "📍", label: "Place",   bg: "bg-white", ring: "ring-sky-400/40" },
  "sticker":        { emoji: "✨", label: "Sticker", bg: "bg-sky-100", ring: "ring-sky-400/40" },
  "event":          { emoji: "🎫", label: "Event",   bg: "bg-white", ring: "ring-pink-500/40" },
  "event-music":    { emoji: "🎵", label: "Show",    bg: "bg-white", ring: "ring-purple-500/40" },
  "event-outdoors": { emoji: "🥾", label: "Outdoors",bg: "bg-white", ring: "ring-emerald-500/40" },
  "event-food":     { emoji: "🍽", label: "Food",    bg: "bg-white", ring: "ring-orange-500/40" },
  "event-social":   { emoji: "👥", label: "Social",  bg: "bg-white", ring: "ring-blue-500/40" },
  "listing":        { emoji: "🏠", label: "Listing", bg: "bg-white", ring: "ring-sky-500/40" },
  "listing-highlighted": { emoji: "🏠", label: "Your pick", bg: "bg-accent-beak", ring: "ring-accent-beakDeep" },
  "comment":        { emoji: "💬", label: "Comment", bg: "bg-white", ring: "ring-sky-300/40" },
  "office":         { emoji: "🏢", label: "Office",  bg: "bg-accent-beak", ring: "ring-accent-beakDeep" },
  "poi-candidate":  { emoji: "★",  label: "Candidate",bg: "bg-white", ring: "ring-accent-beak/40" },
};

/**
 * markerHtml - returns the HTML for a Mapbox marker.
 * `label`: optional Google-Maps-style caption chip below the circle.
 * `halo`:  optional soft area ring around the marker (Google Maps'
 *          "selected place" indicator).
 */
export function markerHtml(
  kind: MarkerKind,
  opts: { size?: number; selected?: boolean; label?: string; halo?: boolean } = {},
): string {
  const meta = ICON_MAP[kind] ?? ICON_MAP.event;
  const size = opts.size ?? 32;
  const selectedRing = opts.selected ? "ring-4 ring-func-pass/80" : "";
  const circle = `<span class="ap-marker inline-flex items-center justify-center rounded-full shadow-card ${meta.bg} ring-2 ${meta.ring} ${selectedRing}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.55)}px;line-height:1" aria-label="${escape(meta.label)}"><span aria-hidden>${meta.emoji}</span></span>`;
  const labelPart = opts.label
    ? `<span class="mt-1 max-w-[160px] truncate rounded-full bg-white shadow-card border border-sky-200 px-2 py-0.5 text-[0.65rem] font-semibold text-ink-strong text-center leading-tight">${escape(opts.label)}</span>`
    : "";
  const halo = opts.halo
    ? `<span class="absolute rounded-full bg-accent-beak/15 border-2 border-accent-beak/50" style="width:${size * 3}px;height:${size * 3}px;left:50%;top:50%;transform:translate(-50%,-50%);z-index:0;pointer-events:none"></span>`
    : "";
  return `<span class="ap-marker-wrap relative flex flex-col items-center" style="pointer-events:auto">${halo}<span class="relative z-10 flex flex-col items-center">${circle}${labelPart}</span></span>`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Map events.category to an event marker kind. */
export function eventKindFor(category: string): MarkerKind {
  const c = category.toLowerCase();
  if (["music", "electronic", "techno", "indie", "shoegaze"].includes(c)) return "event-music";
  if (["outdoors", "hike"].includes(c)) return "event-outdoors";
  if (["food"].includes(c)) return "event-food";
  if (["social", "community"].includes(c)) return "event-social";
  return "event";
}

/** Map Place.kind to a marker kind. */
export function placeKindFor(kind: string): MarkerKind {
  const map: Record<string, MarkerKind> = {
    coffee: "place-coffee",
    gym: "place-gym",
    grocery: "place-grocery",
    transit: "place-transit",
    show: "place-show",
    work: "place-work",
    other: "place-other",
  };
  return map[kind] ?? "place-other";
}

/** The legend rows shown next to the map (RA7). */
export const LEGEND_ROWS: { kind: MarkerKind; label: string }[] = [
  { kind: "place-coffee", label: "Coffee" },
  { kind: "place-gym", label: "Gym" },
  { kind: "place-grocery", label: "Grocery" },
  { kind: "place-transit", label: "Transit" },
  { kind: "place-work", label: "Office" },
  { kind: "sticker", label: "Vibe sticker" },
  { kind: "event", label: "Event" },
  { kind: "listing", label: "Sublet" },
  { kind: "listing-highlighted", label: "Selected apartment" },
  { kind: "comment", label: "Map comment" },
];
