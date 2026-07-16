import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TasteProfile } from "@/lib/types/contract";

const COMPOSIO_API_BASE = "https://backend.composio.dev/api/v3.1";

type SpotifyArtist = { name: string; genres?: string[] };
type SpotifyTrack = { name: string };

export interface SpotifyProvider {
  beginConnect(userId: string): Promise<{ redirectUrl: string }>;
  readTaste(userId: string): Promise<{ connected: boolean; taste: TasteProfile | null }>;
}

export function isComposioEnabled(): boolean {
  return process.env.COMPOSIO_DISABLED !== "1" && Boolean(process.env.COMPOSIO_API_KEY);
}

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

export function toTasteProfile(raw: {
  artists?: SpotifyArtist[];
  tracks?: SpotifyTrack[];
}): TasteProfile {
  const artists = raw.artists ?? [];
  const genreCounts = new Map<string, number>();
  for (const artist of artists) {
    for (const genre of artist.genres ?? []) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  return {
    topArtists: artists.slice(0, 10).map((artist) => artist.name),
    topGenres: [...genreCounts.entries()]
      .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
      .slice(0, 8)
      .map(([genre]) => genre),
    topTracks: (raw.tracks ?? []).slice(0, 10).map((track) => track.name),
  };
}

export class ComposioSpotifyProvider implements SpotifyProvider {
  constructor(
    private readonly apiKey: string,
    private readonly authConfigId: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly callbackUrl = process.env.COMPOSIO_SPOTIFY_CALLBACK_URL,
  ) {}

  async beginConnect(userId: string): Promise<{ redirectUrl: string }> {
    const result = await this.request<{ redirect_url?: string }>("/connected_accounts/link", {
      method: "POST",
      body: JSON.stringify({
        auth_config_id: this.authConfigId,
        user_id: userId,
        ...(this.callbackUrl ? { callback_url: this.callbackUrl } : {}),
      }),
    });
    if (!result.redirect_url) throw new Error("composio_spotify_redirect_missing");
    return { redirectUrl: result.redirect_url };
  }

  async readTaste(userId: string): Promise<{ connected: boolean; taste: TasteProfile | null }> {
    const query = new URLSearchParams({
      toolkit_slugs: "spotify",
      statuses: "ACTIVE",
      user_ids: userId,
      limit: "1",
    });
    const accounts = await this.request<{
      items?: { id: string; status?: string; toolkit?: { slug?: string } }[];
    }>(`/connected_accounts?${query.toString()}`);
    const account = accounts.items?.find(
      (item) => item.status === "ACTIVE" && item.toolkit?.slug === "spotify",
    );
    if (!account) return { connected: false, taste: null };

    const [artists, tracks] = await Promise.all([
      this.spotifyGet<{ items?: SpotifyArtist[] }>(account.id, "/v1/me/top/artists"),
      this.spotifyGet<{ items?: SpotifyTrack[] }>(account.id, "/v1/me/top/tracks"),
    ]);
    const taste = toTasteProfile({
      artists: artists.items ?? [],
      tracks: tracks.items ?? [],
    });
    return { connected: true, taste };
  }

  private async spotifyGet<T>(connectedAccountId: string, endpoint: string): Promise<T> {
    const response = await this.request<{ data?: T }>("/tools/execute/proxy", {
      method: "POST",
      body: JSON.stringify({
        endpoint,
        method: "GET",
        connected_account_id: connectedAccountId,
        parameters: [{ name: "limit", value: "10", in: "query" }],
      }),
    });
    if (!response.data) throw new Error("composio_spotify_proxy_data_missing");
    return response.data;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`${COMPOSIO_API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`composio_spotify_http_${response.status}`);
    }
    return payload as T;
  }
}

function liveProvider(): SpotifyProvider {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const authConfigId = process.env.COMPOSIO_SPOTIFY_AUTH_CONFIG_ID;
  if (!apiKey || !authConfigId) {
    throw new Error("composio_spotify_configuration_missing");
  }
  return new ComposioSpotifyProvider(apiKey, authConfigId);
}

export async function beginSpotifyConnect(
  userId: string,
  provider?: SpotifyProvider,
): Promise<{ redirectUrl: string }> {
  if (!isComposioEnabled() && !provider) {
    return { redirectUrl: "/onboarding?spotify=demo" };
  }
  return (provider ?? liveProvider()).beginConnect(userId);
}

export async function readSpotifyTaste(
  userId: string,
  provider?: SpotifyProvider,
): Promise<{ connected: boolean; taste: TasteProfile | null }> {
  if (!isComposioEnabled() && !provider) {
    return { connected: true, taste: fallbackTaste() };
  }
  return (provider ?? liveProvider()).readTaste(userId);
}
