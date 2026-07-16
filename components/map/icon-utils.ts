import { STICKER_META } from "./sticker-catalog";
import type { StickerCategory } from "@/lib/types/contract";

/** Re-exports of icon-catalog helpers so imports work cleanly from MapCanvas. */
export {
  markerHtml,
  eventKindFor,
  placeKindFor,
  LEGEND_ROWS,
  ICON_MAP,
} from "./icon-catalog";
export type { MarkerKind, MarkerVisual } from "./icon-catalog";

/** HTML-safe hint for the tooltip on sticker markers. */
export function STICKER_META_HTML_HINT(category: StickerCategory): string {
  const meta = STICKER_META[category];
  const s = `${meta.label}: ${meta.hint}`;
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
