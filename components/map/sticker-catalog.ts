import type { StickerCategory } from "@/lib/types/contract";
import { POSITIVE_STICKER_CATEGORIES } from "@/lib/types/contract";

/**
 * Sticker catalog - POSITIVE-ONLY per contract §2, §8.
 *
 * This file is the single source of truth for the sticker categories the UI
 * exposes. There is NO avoid/unsafe/negative category anywhere. Person B
 * backstops via a DB CHECK constraint on stickers.category.
 */
export type StickerMeta = {
  category: StickerCategory;
  emoji: string;
  label: string;
  hint: string;
};

export const STICKER_META: Record<StickerCategory, StickerMeta> = {
  good_coffee: { category: "good_coffee", emoji: "☕", label: "Good coffee", hint: "A spot you'd send a friend to." },
  safe_feeling: { category: "safe_feeling", emoji: "🛡️", label: "Safe-feeling", hint: "Well-lit, calm, walk-home friendly." },
  interns_hang: { category: "interns_hang", emoji: "👋", label: "Interns hang", hint: "Where the cohort ends up." },
  good_vibe: { category: "good_vibe", emoji: "✨", label: "Good vibe", hint: "A place that feels good to be in." },
  great_food: { category: "great_food", emoji: "🍜", label: "Great food", hint: "A meal worth the walk." },
  green_space: { category: "green_space", emoji: "🌳", label: "Green space", hint: "Grass. Trees. A minute of quiet." },
};

/** Ordered list of sticker categories for the picker - positive only. */
export const STICKER_ORDER = POSITIVE_STICKER_CATEGORIES.map((c) => STICKER_META[c]);
