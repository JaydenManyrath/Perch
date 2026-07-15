import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TasteProfile } from "@/lib/types/contract";

/**
 * Spotify connect via Composio (B5) — READ-ONLY scopes only (top artists/tracks;
 * NO playback/playlist/write, per CLAUDE.md §7). Timeboxed spike with a deterministic
 * fallback: when `COMPOSIO_DISABLED=1` (or no key), the fixture taste vector is used
 * so `taste_profile` is always populated (plan §2.3 / §6 Phase 6).
 */

export function isComposioEnabled(): boolean {
  return process.env.COMPOSIO_DISABLED !== "1" && !!process.env.COMPOSIO_API_KEY;
}

/** The fixture taste vector used as the fallback / demo default. */
export function fallbackTaste(): TasteProfile {
  const raw = readFileSync(
    join(process.cwd(), "scripts", "fixtures", "taste_vectors.json"),
    "utf8",
  );
  const parsed = JSON.parse(raw) as TasteProfile & { _note?: string };
  return {
    topArtists: parsed.topArtists ?? [],
    topGenres: parsed.topGenres ?? [],
    topTracks: parsed.topTracks ?? [],
    energy: parsed.energy,
  };
}

/**
 * Map raw Spotify top-items into a deterministic taste_profile vector. Kept pure so
 * both the live path and any test can normalize identically.
 */
export function toTasteProfile(raw: {
  artists?: { name: string; genres?: string[] }[];
  tracks?: { name: string }[];
}): TasteProfile {
  const artists = raw.artists ?? [];
  const genreCounts = new Map<string, number>();
  for (const a of artists) {
    for (const g of a.genres ?? []) {
      genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0] < b[0] ? -1 : 1))
    .slice(0, 8)
    .map(([g]) => g);

  return {
    topArtists: artists.slice(0, 10).map((a) => a.name),
    topGenres,
    topTracks: (raw.tracks ?? []).slice(0, 10).map((t) => t.name),
  };
}

/**
 * Begin the Composio-hosted OAuth connect. Returns a redirect URL. When Composio is
 * disabled we return an internal callback that immediately "connects" with the
 * fixture taste (dev/demo), so the onboarding UI (A12) flow still completes.
 */
export async function beginSpotifyConnect(userId: string): Promise<{ redirectUrl: string }> {
  if (!isComposioEnabled()) {
    return { redirectUrl: `/api/composio/spotify/status?demo=1&u=${encodeURIComponent(userId)}` };
  }
  // Live Composio path (best-effort; real SDK wiring happens when a key is present).
  // Kept behind fetch so the build never hard-depends on the Composio SDK.
  const base = "https://backend.composio.dev/api/v2/connectedAccounts/initiate";
  try {
    const res = await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.COMPOSIO_API_KEY!,
      },
      body: JSON.stringify({ appName: "spotify", entityId: userId }),
    });
    const data = (await res.json()) as { redirectUrl?: string };
    return { redirectUrl: data.redirectUrl ?? "/onboarding?spotify=error" };
  } catch {
    // Fall back to the demo path rather than blocking onboarding.
    return { redirectUrl: `/api/composio/spotify/status?demo=1&u=${encodeURIComponent(userId)}` };
  }
}
